const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { createTenant } = require('../tenants');
const { applyPlan } = require('../billing');
const { PLANS, TRIAL_DAYS } = require('../plans');

const planKey = z.enum(Object.keys(PLANS));

router.get('/tenants', async (_req, res) => {
  const rows = await db('tenants as t')
    .leftJoin('memberships as m', 'm.tenant_id', 't.id')
    .groupBy('t.id')
    .select('t.id', 't.name', 't.slug', 't.plan', 't.active', 't.subscription_status as status', 't.trial_ends_at', 't.current_period_end', 't.stripe_customer_id', 't.created_at')
    .count({ users: 'm.user_id' })
    .orderBy('t.name');
  res.json(rows);
});

const schema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  plan: planKey.optional(),
  trial: z.boolean().optional(),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

// Alta manual de un cliente (empresa + administrador). Con trial:true arranca en prueba gratuita.
router.post('/tenants', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const d = parsed.data;
  if (await db('tenants').where({ slug: d.slug }).first()) return res.status(409).json({ error: 'Ese slug ya existe' });

  const email = d.adminEmail.toLowerCase();
  const id = await db.transaction(async (trx) => {
    const { tenantId, adminRoleId } = await createTenant(trx, { name: d.name, slug: d.slug, plan: d.plan, trialDays: d.trial ? TRIAL_DAYS : 0 });
    let user = await trx('users').where({ email }).first();
    if (!user) {
      const [uid] = await trx('users').insert({ name: d.adminName, email, password_hash: await bcrypt.hash(d.adminPassword, 12) });
      user = { id: uid };
    }
    await trx('memberships').insert({ user_id: user.id, tenant_id: tenantId, role_id: adminRoleId });
    return tenantId;
  });
  res.status(201).json({ id });
});

const patchSchema = z.object({
  plan: planKey.optional(),
  subscription_status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'suspended']).optional(),
  active: z.boolean().optional(),
  extend_trial_days: z.number().int().min(1).max(365).optional(),
});

// Control manual del dueño de la plataforma: cambiar plan, suspender, reactivar o extender la prueba.
router.patch('/tenants/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data).length) return res.status(400).json({ error: 'Datos inválidos' });
  const id = Number(req.params.id);
  const tenant = await db('tenants').where({ id }).first();
  if (!tenant) return res.status(404).json({ error: 'No encontrado' });
  const { plan, extend_trial_days: days, ...rest } = parsed.data;

  await db.transaction(async (trx) => {
    if (Object.keys(rest).length) await trx('tenants').where({ id }).update(rest);
    if (days) await trx('tenants').where({ id }).update({ subscription_status: 'trialing', trial_ends_at: new Date(Date.now() + days * 864e5) });
    if (plan) await applyPlan(trx, id, plan);
    await trx('audit_log').insert({ tenant_id: id, user_id: req.ctx.user.id, module: 'platform', entity: 'tenants', record_id: String(id), action: 'editar', detail: JSON.stringify(parsed.data) });
  });
  res.json({ ok: true });
});

module.exports = router;
