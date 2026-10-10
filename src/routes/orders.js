const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { requirePermission } = require('../middleware/auth');
const { allowedAirports, owned } = require('../scope');
const { audit } = require('../audit');
const { isOutOfPeriod } = require('../orders/period');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const createSchema = z.object({
  airport_id: z.number().int().positive(),
  airline_id: z.number().int().positive(),
  event_type_id: z.number().int().positive(),
  flight: z.string().trim().max(40).optional().default(''),
  date_in: date,
  date_out: date,
  hour: z.string().regex(/^\d{2}:\d{2}$/).optional().default(''),
  hotels: z.array(z.object({ hotel_id: z.number().int().positive(), rooms: z.number().int().min(0).max(9999) })).max(50).default([]),
});

const code = (o) => `${o.prefix}-${o.folio}`;

// Devuelve una fábrica de consultas ya restringidas a la empresa y a las estaciones del usuario.
// (No se devuelve el query desde una función async: JS lo ejecutaría al resolverla.)
async function scopedOrders(ctx) {
  const airports = await allowedAirports(ctx);
  return () => {
    const q = db('orders as o').where('o.tenant_id', ctx.tenant.id);
    if (airports) q.whereIn('o.airport_id', airports.length ? airports : [0]);
    return q;
  };
}

router.get('/orders', requirePermission('orders.read'), async (req, res) => {
  const q = (await scopedOrders(req.ctx))()
    .join('airlines as l', 'l.id', 'o.airline_id')
    .join('airports as a', 'a.id', 'o.airport_id')
    .join('event_types as e', 'e.id', 'o.event_type_id')
    .select('o.id', 'o.prefix', 'o.folio', 'o.flight', 'o.date_in', 'o.date_out', 'o.hour', 'o.status', 'l.name as airline', 'a.name as airport', 'e.name as event')
    .orderBy('o.id', 'desc')
    .limit(500);
  if (['open', 'close'].includes(req.query.status)) q.where('o.status', req.query.status);
  res.json((await q).map((o) => ({ ...o, code: code(o) })));
});

router.get('/orders/:id', requirePermission('orders.read'), async (req, res) => {
  const o = await (await scopedOrders(req.ctx))()
    .join('airlines as l', 'l.id', 'o.airline_id')
    .join('airports as a', 'a.id', 'o.airport_id')
    .join('event_types as e', 'e.id', 'o.event_type_id')
    .join('users as u', 'u.id', 'o.created_by')
    .where('o.id', Number(req.params.id))
    .select('o.*', 'l.name as airline', 'a.name as airport', 'e.name as event', 'u.name as created_by_name')
    .first();
  if (!o) return res.status(404).json({ error: 'No encontrado' });
  const hotels = await db('order_hotels as oh').join('hotels as h', 'h.id', 'oh.hotel_id').where('oh.order_id', o.id)
    .select('oh.id', 'h.name', 'oh.rooms', 'oh.rooms_available');
  const comments = await db('order_comments as c').join('users as u', 'u.id', 'c.user_id').where('c.order_id', o.id)
    .select('c.id', 'c.comment', 'c.created_at', 'u.name as user').orderBy('c.id');
  res.json({ ...o, code: code(o), hotels, comments });
});

router.post('/orders', requirePermission('orders.create'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const d = parsed.data;
  const { ctx } = req;
  const tid = ctx.tenant.id;

  const allowed = await allowedAirports(ctx);
  if (allowed && !allowed.includes(d.airport_id)) return res.status(403).json({ error: 'No tienes acceso a esa estación' });
  if (d.date_out < d.date_in) return res.status(400).json({ error: 'La fecha de salida es anterior a la de entrada' });

  const airport = await owned('airports', d.airport_id, tid);
  const airline = await owned('airlines', d.airline_id, tid);
  const event = await owned('event_types', d.event_type_id, tid);
  if (!airport?.active || !airline?.active || !event) return res.status(400).json({ error: 'Estación, aerolínea o evento inválido' });
  if (!(await db('airline_airports').where({ tenant_id: tid, airline_id: airline.id, airport_id: airport.id }).first())) {
    return res.status(400).json({ error: 'Esa aerolínea no opera en la estación elegida' });
  }

  const hotelIds = [...new Set(d.hotels.map((h) => h.hotel_id))];
  if (hotelIds.length !== d.hotels.length) return res.status(400).json({ error: 'Hotel repetido' });
  if (hotelIds.length) {
    const found = await db('hotels').where({ tenant_id: tid, airport_id: airport.id, active: true }).whereIn('id', hotelIds).count({ n: '*' }).first();
    if (Number(found.n) !== hotelIds.length) return res.status(400).json({ error: 'Hotel inválido para esa estación' });
  }

  // Periodo permitido: fuera de él solo con evento exento o permiso explícito.
  if (isOutOfPeriod([d.date_in, d.date_out]) && !event.exempt_period && !ctx.permissions.includes('orders.out_of_period')) {
    return res.status(422).json({ error: 'Las fechas están fuera del periodo permitido', code: 'fecha_bloqueada' });
  }

  const result = await db.transaction(async (trx) => {
    // Folio atómico por aeropuerto: se bloquea la fila para que dos órdenes simultáneas no reciban el mismo número.
    const locked = await trx('airports').where({ id: airport.id, tenant_id: tid }).forUpdate().first();
    const folio = locked.next_folio;
    const prefix = (locked.iata || `E${locked.id}`).toUpperCase();
    const [orderId] = await trx('orders').insert({
      tenant_id: tid, airport_id: airport.id, folio, prefix, flight: d.flight, event_type_id: event.id,
      airline_id: airline.id, date_in: d.date_in, date_out: d.date_out, hour: d.hour, created_by: ctx.user.id,
    });
    await trx('airports').where({ id: airport.id }).update({ next_folio: folio + 1 });
    if (d.hotels.length) {
      await trx('order_hotels').insert(d.hotels.map((h) => ({ order_id: orderId, hotel_id: h.hotel_id, rooms: h.rooms, rooms_available: h.rooms })));
    }
    await audit(ctx, { module: 'orders', entity: 'orders', recordId: orderId, action: 'crear', detail: `Vuelo ${d.flight} | ${d.date_in} a ${d.date_out}` }, trx);
    return { id: orderId, code: `${prefix}-${folio}` };
  });
  res.status(201).json(result);
});

async function setStatus(req, res, status) {
  const o = await (await scopedOrders(req.ctx))().where('o.id', Number(req.params.id)).select('o.id', 'o.status').first();
  if (!o) return res.status(404).json({ error: 'No encontrado' });
  if (o.status === status) return res.status(409).json({ error: 'La orden ya está en ese estado' });
  await db.transaction(async (trx) => {
    await trx('orders').where({ id: o.id }).update({ status, closed_at: status === 'close' ? trx.fn.now() : null });
    await audit(req.ctx, { module: 'orders', entity: 'orders', recordId: o.id, action: status === 'close' ? 'cerrar' : 'reabrir', detail: `Estatus -> ${status}` }, trx);
  });
  res.json({ ok: true });
}
router.post('/orders/:id/close', requirePermission('orders.close'), (req, res) => setStatus(req, res, 'close'));
router.post('/orders/:id/reopen', requirePermission('orders.close'), (req, res) => setStatus(req, res, 'open'));

router.post('/orders/:id/comments', requirePermission('orders.read'), async (req, res) => {
  const parsed = z.object({ comment: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Comentario inválido' });
  const o = await (await scopedOrders(req.ctx))().where('o.id', Number(req.params.id)).select('o.id').first();
  if (!o) return res.status(404).json({ error: 'No encontrado' });
  await db('order_comments').insert({ order_id: o.id, user_id: req.ctx.user.id, comment: parsed.data.comment });
  res.status(201).json({ ok: true });
});

module.exports = router;
