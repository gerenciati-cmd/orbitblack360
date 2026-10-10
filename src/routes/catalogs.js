// CRUD genérico de catálogos, dirigido por configuración. Todo se filtra por empresa (tenant_id).
const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { requirePermission } = require('../middleware/auth');
const { owned } = require('../scope');
const { audit } = require('../audit');

const id = z.number().int().positive();
const name = (max = 160) => z.string().trim().min(1).max(max);
const active = z.boolean().optional();

// refs: campo -> tabla padre (se valida que sea de la misma empresa).
// derive: completa campos a partir de los padres (p. ej. la ciudad del hotel sale de su aeropuerto).
const ENTITIES = {
  countries: {
    table: 'countries',
    shape: { name: name(120), code: z.string().trim().max(10).optional() },
    list: (tid) => db('countries').where({ tenant_id: tid }).select('id', 'name', 'code', 'name as label').orderBy('name'),
  },
  cities: {
    table: 'cities',
    shape: { name: name(120), iata: z.string().trim().max(10).optional(), country_id: id, active },
    refs: { country_id: 'countries' },
    list: (tid) => db('cities as c').join('countries as p', 'p.id', 'c.country_id').where('c.tenant_id', tid)
      .select('c.id', 'c.name', 'c.iata', 'c.country_id', 'c.active', 'p.name as country', db.raw("CONCAT(c.name, ' (', p.name, ')') as label")).orderBy('c.name'),
  },
  airports: {
    table: 'airports',
    shape: { name: name(), iata: z.string().trim().max(10).optional(), country_id: id, city_id: id, active },
    refs: { country_id: 'countries', city_id: 'cities' },
    list: (tid) => db('airports as a').join('cities as c', 'c.id', 'a.city_id').where('a.tenant_id', tid)
      .select('a.id', 'a.name', 'a.iata', 'a.country_id', 'a.city_id', 'a.active', 'c.name as city', db.raw("CONCAT(a.name, ' (', COALESCE(NULLIF(a.iata, ''), c.name), ')') as label")).orderBy('a.name'),
  },
  airlines: {
    table: 'airlines',
    shape: { name: name(120), active },
    list: (tid) => db('airlines').where({ tenant_id: tid }).select('id', 'name', 'active', 'name as label').orderBy('name'),
  },
  'airline-airports': {
    table: 'airline_airports',
    shape: {
      airline_id: id,
      airport_id: id,
      currency: z.string().trim().min(1).max(10).optional(),
      system_rate: z.number().int().min(1).max(9).optional(),
      type_rate: z.enum(['all', 'ep']).optional(),
    },
    refs: { airline_id: 'airlines', airport_id: 'airports' },
    list: (tid) => db('airline_airports as x').join('airlines as l', 'l.id', 'x.airline_id').join('airports as a', 'a.id', 'x.airport_id').where('x.tenant_id', tid)
      .select('x.id', 'x.airline_id', 'x.airport_id', 'x.currency', 'x.system_rate', 'x.type_rate', 'l.name as airline', 'a.name as airport', db.raw("CONCAT(l.name, ' · ', a.name) as label")).orderBy(['l.name', 'a.name']),
  },
  'hotel-categories': {
    table: 'hotel_categories',
    shape: { name: name(80) },
    list: (tid) => db('hotel_categories').where({ tenant_id: tid }).select('id', 'name', 'name as label').orderBy('name'),
  },
  'hotel-zones': {
    table: 'hotel_zones',
    shape: { name: name(80) },
    list: (tid) => db('hotel_zones').where({ tenant_id: tid }).select('id', 'name', 'name as label').orderBy('name'),
  },
  hotels: {
    table: 'hotels',
    shape: { name: name(), airport_id: id, category_id: id.nullable().optional(), zone_id: id.nullable().optional(), active },
    refs: { airport_id: 'airports', category_id: 'hotel_categories', zone_id: 'hotel_zones' },
    derive: (data, parents) => (parents.airport_id ? { city_id: parents.airport_id.city_id } : {}),
    list: (tid) => db('hotels as h').join('airports as a', 'a.id', 'h.airport_id')
      .leftJoin('hotel_categories as k', 'k.id', 'h.category_id').leftJoin('hotel_zones as z', 'z.id', 'h.zone_id').where('h.tenant_id', tid)
      .select('h.id', 'h.name', 'h.airport_id', 'h.category_id', 'h.zone_id', 'h.active', 'a.name as airport', 'k.name as category', 'z.name as zone', db.raw("CONCAT(h.name, ' · ', a.name) as label")).orderBy('h.name'),
  },
  transports: {
    table: 'transports',
    shape: { name: name(), airport_id: id, active },
    refs: { airport_id: 'airports' },
    derive: (data, parents) => (parents.airport_id ? { city_id: parents.airport_id.city_id } : {}),
    list: (tid) => db('transports as t').join('airports as a', 'a.id', 't.airport_id').where('t.tenant_id', tid)
      .select('t.id', 't.name', 't.airport_id', 't.active', 'a.name as airport', db.raw("CONCAT(t.name, ' · ', a.name) as label")).orderBy('t.name'),
  },
  'event-types': {
    table: 'event_types',
    shape: { name: name(120), exempt_period: z.boolean().optional() },
    list: (tid) => db('event_types').where({ tenant_id: tid }).select('id', 'name', 'exempt_period', 'name as label').orderBy('name'),
  },
};

for (const e of Object.values(ENTITIES)) {
  e.schema = z.object(e.shape);
  e.partial = e.schema.partial();
}

// Valida que cada referencia exista en la misma empresa y devuelve las filas padre.
async function checkRefs(entity, data, tid) {
  const parents = {};
  for (const [field, table] of Object.entries(entity.refs || {})) {
    if (data[field] == null) continue;
    parents[field] = await owned(table, data[field], tid);
    if (!parents[field]) return { error: `Referencia inválida: ${field}` };
  }
  if (parents.city_id && parents.country_id && parents.city_id.country_id !== parents.country_id.id) {
    return { error: 'La ciudad no pertenece a ese país' };
  }
  return { parents };
}

const dbError = (err, res) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro igual' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'No se puede eliminar: está en uso' });
  throw err;
};

router.use('/catalogs/:entity', (req, res, next) => {
  req.entity = Object.hasOwn(ENTITIES, req.params.entity) ? ENTITIES[req.params.entity] : null;
  return req.entity ? next() : res.status(404).json({ error: 'Catálogo no encontrado' });
});

router.get('/catalogs/:entity', requirePermission('catalogs.read'), async (req, res) => {
  res.json(await req.entity.list(req.ctx.tenant.id));
});

router.post('/catalogs/:entity', requirePermission('catalogs.manage'), async (req, res) => {
  const parsed = req.entity.schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const tid = req.ctx.tenant.id;
  const { parents, error } = await checkRefs(req.entity, parsed.data, tid);
  if (error) return res.status(400).json({ error });
  const row = { ...parsed.data, ...(req.entity.derive?.(parsed.data, parents) || {}), tenant_id: tid };
  try {
    const [newId] = await db(req.entity.table).insert(row);
    await audit(req.ctx, { module: 'catalogs', entity: req.entity.table, recordId: newId, action: 'crear', detail: JSON.stringify(parsed.data) });
    res.status(201).json({ id: newId });
  } catch (err) {
    dbError(err, res);
  }
});

router.patch('/catalogs/:entity/:id', requirePermission('catalogs.manage'), async (req, res) => {
  const parsed = req.entity.partial.safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data).length) return res.status(400).json({ error: 'Datos inválidos' });
  const tid = req.ctx.tenant.id;
  const current = await owned(req.entity.table, Number(req.params.id), tid);
  if (!current) return res.status(404).json({ error: 'No encontrado' });
  const merged = { ...current, ...parsed.data };
  const { parents, error } = await checkRefs(req.entity, merged, tid);
  if (error) return res.status(400).json({ error });
  const changes = { ...parsed.data, ...(req.entity.derive?.(merged, parents) || {}) };
  try {
    await db(req.entity.table).where({ id: current.id, tenant_id: tid }).update(changes);
    await audit(req.ctx, { module: 'catalogs', entity: req.entity.table, recordId: current.id, action: 'editar', detail: JSON.stringify(parsed.data) });
    res.json({ ok: true });
  } catch (err) {
    dbError(err, res);
  }
});

router.delete('/catalogs/:entity/:id', requirePermission('catalogs.manage'), async (req, res) => {
  const tid = req.ctx.tenant.id;
  try {
    const n = await db(req.entity.table).where({ id: Number(req.params.id), tenant_id: tid }).del();
    if (!n) return res.status(404).json({ error: 'No encontrado' });
    await audit(req.ctx, { module: 'catalogs', entity: req.entity.table, recordId: req.params.id, action: 'eliminar' });
    res.json({ ok: true });
  } catch (err) {
    dbError(err, res);
  }
});

module.exports = router;
