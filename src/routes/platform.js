// Panel del dueño de la plataforma: administra todas las empresas (internas y clientes).
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { createTenant } = require('../tenants');
const { applyPlan } = require('../billing');
const { PLANS, TRIAL_DAYS } = require('../plans');
const { MODULES } = require('../permissions');

const planKey = z.enum(Object.keys(PLANS));
const kind = z.enum(['internal', 'customer']);

const audit = (req, tenantId, action, detail, trx = db) => trx('audit_log').insert({
  tenant_id: tenantId, user_id: req.ctx.user.id, module: 'platform', entity: 'tenants', record_id: String(tenantId), action, detail,
});

// Resumen del negocio: cuántas empresas hay por tipo y estado, y usuarios totales.
router.get('/summary', async (_req, res) => {
  const rows = await db('tenants').select('kind', 'subscription_status as status', 'plan').count({ n: '*' }).groupBy('kind', 'subscription_status', 'plan');
  const sum = (f) => rows.filter(f).reduce((a, r) => a + Number(r.n), 0);
  const { users } = await db('users').count({ users: '*' }).first();
  res.json({
    total: sum(() => true),
    internal: sum((r) => r.kind === 'internal'),
    customers: sum((r) => r.kind === 'customer'),
    trialing: sum((r) => r.kind === 'customer' && r.status === 'trialing'),
    active: sum((r) => r.kind === 'customer' && r.status === 'active'),
    past_due: sum((r) => r.status === 'past_due'),
    inactive: sum((r) => ['canceled', 'suspended'].includes(r.status)),
    users: Number(users),
    byPlan: Object.fromEntries(Object.keys(PLANS).map((p) => [p, sum((r) => r.kind === 'customer' && r.plan === p && ['active', 'past_due'].includes(r.status))])),
  });
});

router.get('/tenants', async (req, res) => {
  const q = db('tenants as t')
    .leftJoin('memberships as m', 'm.tenant_id', 't.id')
    .groupBy('t.id')
    .select('t.id', 't.name', 't.slug', 't.kind', 't.plan', 't.active', 't.subscription_status as status', 't.trial_ends_at', 't.current_period_end', 't.stripe_customer_id', 't.created_at')
    .count({ users: 'm.user_id' })
    .orderBy('t.name');
  if (['internal', 'customer'].includes(req.query.kind)) q.where('t.kind', req.query.kind);
  res.json(await q);
});

// Ficha de una empresa: usuarios, módulos activos y actividad reciente.
router.get('/tenants/:id', async (req, res) => {
  const id = Number(req.params.id);
  const tenant = await db('tenants').where({ id }).first();
  if (!tenant) return res.status(404).json({ error: 'No encontrado' });
  const users = await db('memberships as m').join('users as u', 'u.id', 'm.user_id').join('roles as r', 'r.id', 'm.role_id')
    .where('m.tenant_id', id).select('u.id', 'u.name', 'u.email', 'u.last_login_at', 'r.name as role').orderBy('u.name');
  const enabled = Object.fromEntries((await db('tenant_modules').where({ tenant_id: id })).map((m) => [m.module_key, !!m.enabled]));
  const activity = await db('audit_log as a').leftJoin('users as u', 'u.id', 'a.user_id').where('a.tenant_id', id)
    .select('a.id', 'a.module', 'a.entity', 'a.action', 'a.detail', 'a.created_at', 'u.name as user').orderBy('a.id', 'desc').limit(30);
  res.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, kind: tenant.kind, plan: tenant.plan, active: !!tenant.active, status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at, current_period_end: tenant.current_period_end, stripe_customer_id: tenant.stripe_customer_id, created_at: tenant.created_at },
    users,
    modules: Object.entries(MODULES).map(([key, label]) => ({ key, label, enabled: !!enabled[key] })),
    activity,
  });
});

const schema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  kind: kind.optional(),
  plan: planKey.optional(),
  trial: z.boolean().optional(),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

// Alta manual de una empresa (cliente o interna) con su administrador. trial:true arranca en prueba gratuita.
router.post('/tenants', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const d = parsed.data;
  if (await db('tenants').where({ slug: d.slug }).first()) return res.status(409).json({ error: 'Ese slug ya existe' });

  const email = d.adminEmail.toLowerCase();
  const id = await db.transaction(async (trx) => {
    const { tenantId, adminRoleId } = await createTenant(trx, { name: d.name, slug: d.slug, plan: d.plan, trialDays: d.trial ? TRIAL_DAYS : 0 });
    if (d.kind) await trx('tenants').where({ id: tenantId }).update({ kind: d.kind });
    let user = await trx('users').where({ email }).first();
    if (!user) {
      const [uid] = await trx('users').insert({ name: d.adminName, email, password_hash: await bcrypt.hash(d.adminPassword, 12) });
      user = { id: uid };
    }
    await trx('memberships').insert({ user_id: user.id, tenant_id: tenantId, role_id: adminRoleId });
    await audit(req, tenantId, 'crear', `Alta manual (${d.kind || 'customer'}, plan ${d.plan || 'basic'})`, trx);
    return tenantId;
  });
  res.status(201).json({ id });
});

const patchSchema = z.object({
  plan: planKey.optional(),
  kind: kind.optional(),
  subscription_status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'suspended']).optional(),
  active: z.boolean().optional(),
  extend_trial_days: z.number().int().min(1).max(365).optional(),
  // Ajuste manual de módulos de esta empresa (el inicio siempre queda activo). Un cambio de plan posterior lo reinicia.
  modules: z.record(z.string(), z.boolean()).optional(),
});

router.patch('/tenants/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data).length) return res.status(400).json({ error: 'Datos inválidos' });
  const id = Number(req.params.id);
  const tenant = await db('tenants').where({ id }).first();
  if (!tenant) return res.status(404).json({ error: 'No encontrado' });
  const { plan, extend_trial_days: days, modules, ...rest } = parsed.data;
  if (modules && Object.keys(modules).some((m) => !Object.hasOwn(MODULES, m))) return res.status(400).json({ error: 'Módulo desconocido' });

  await db.transaction(async (trx) => {
    if (Object.keys(rest).length) await trx('tenants').where({ id }).update(rest);
    if (days) await trx('tenants').where({ id }).update({ subscription_status: 'trialing', trial_ends_at: new Date(Date.now() + days * 864e5) });
    if (plan) await applyPlan(trx, id, plan);
    if (modules) {
      for (const [key, enabled] of Object.entries(modules)) {
        await trx('tenant_modules').insert({ tenant_id: id, module_key: key, enabled: key === 'dashboard' ? true : enabled })
          .onConflict(['tenant_id', 'module_key']).merge();
      }
    }
    await audit(req, id, 'editar', JSON.stringify(parsed.data), trx);
  });
  res.json({ ok: true });
});

module.exports = router;
