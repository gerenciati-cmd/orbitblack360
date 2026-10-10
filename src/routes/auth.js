const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createTenant } = require('../tenants');
const { TRIAL_DAYS, TRIAL_PLAN } = require('../plans');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../db');
const cfg = require('../config');
const { signAccess, issueRefresh, rotateRefresh, revokeRefresh, loadContext, listTenantsOf } = require('../auth');
const { requireAuth } = require('../middleware/auth');

const COOKIE = 'ob_refresh';
const cookieOpts = {
  httpOnly: true,
  secure: cfg.isProd,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: cfg.refreshTtlDays * 864e5,
};

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

// Respuesta de sesión: access token en JSON; refresh en cookie httpOnly (web) y en el body (móvil).
async function sessionResponse(res, userId, tenantId, refreshToken) {
  const ctx = await loadContext(userId, tenantId);
  const refresh = refreshToken || (await issueRefresh(userId, tenantId));
  res.cookie(COOKIE, refresh, cookieOpts);
  return res.json({
    accessToken: signAccess(userId, tenantId),
    refreshToken: refresh,
    tenants: await listTenantsOf(userId),
    ...ctx,
  });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(),
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const { email, password, tenantSlug } = parsed.data;

  const user = await db('users').where({ email: email.toLowerCase(), active: true }).first();
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  const tenants = await listTenantsOf(user.id);
  const tenant = tenantSlug ? tenants.find((t) => t.slug === tenantSlug) : tenants[0];
  if (!tenant) return res.status(403).json({ error: 'El usuario no pertenece a ninguna empresa activa' });

  await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now() });
  return sessionResponse(res, user.id, tenant.id);
});

const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const signupSchema = z.object({
  company: z.string().trim().min(2).max(120),
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'empresa';

// Registro público: crea la empresa en prueba gratuita con su administrador y abre sesión.
router.post('/signup', signupLimiter, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Revisa los datos (contraseña mínimo 8 caracteres)' });
  const d = parsed.data;
  const email = d.email.toLowerCase();
  if (await db('users').where({ email }).first()) {
    return res.status(409).json({ error: 'Ese correo ya tiene una cuenta. Inicia sesión.' });
  }

  const slug = `${slugify(d.company)}-${crypto.randomBytes(3).toString('hex')}`;
  const { userId, tenantId } = await db.transaction(async (trx) => {
    const { tenantId, adminRoleId } = await createTenant(trx, { name: d.company, slug, plan: TRIAL_PLAN, trialDays: TRIAL_DAYS });
    const [userId] = await trx('users').insert({ name: d.name, email, password_hash: await bcrypt.hash(d.password, 12) });
    await trx('memberships').insert({ user_id: userId, tenant_id: tenantId, role_id: adminRoleId });
    return { userId, tenantId };
  });
  res.status(201);
  return sessionResponse(res, userId, tenantId);
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies[COOKIE] || req.body?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Sin sesión' });
  const rotated = await rotateRefresh(token);
  if (!rotated || !(await loadContext(rotated.userId, rotated.tenantId))) {
    res.clearCookie(COOKIE, { path: '/api/auth' });
    return res.status(401).json({ error: 'Sesión expirada' });
  }
  return sessionResponse(res, rotated.userId, rotated.tenantId, rotated.refresh);
});

router.post('/logout', async (req, res) => {
  const token = req.cookies[COOKIE] || req.body?.refreshToken;
  if (token) await revokeRefresh(token);
  res.clearCookie(COOKIE, { path: '/api/auth' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ ...req.ctx, tenants: await listTenantsOf(req.ctx.user.id) });
});

router.post('/switch-tenant', requireAuth, async (req, res) => {
  const tenantId = Number(req.body?.tenantId);
  const ctx = await loadContext(req.ctx.user.id, tenantId);
  if (!ctx) return res.status(403).json({ error: 'Empresa no disponible' });
  // Acceso de soporte a una empresa ajena: queda registrado en la bitácora de esa empresa.
  if (ctx.supportMode) {
    await db('audit_log').insert({ tenant_id: tenantId, user_id: req.ctx.user.id, module: 'platform', entity: 'tenants', record_id: String(tenantId), action: 'acceso_soporte', detail: ctx.user.email });
  }
  return sessionResponse(res, req.ctx.user.id, tenantId);
});

module.exports = router;
