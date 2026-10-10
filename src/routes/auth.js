const router = require('express').Router();
const bcrypt = require('bcryptjs');
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
  if (!(await loadContext(req.ctx.user.id, tenantId))) return res.status(403).json({ error: 'Empresa no disponible' });
  return sessionResponse(res, req.ctx.user.id, tenantId);
});

module.exports = router;
