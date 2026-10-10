const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./db');
const cfg = require('./config');
const { subscriptionState } = require('./plans');
const { PERMISSIONS } = require('./permissions');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function signAccess(userId, tenantId) {
  return jwt.sign({ sub: userId, tid: tenantId }, cfg.jwtSecret, { expiresIn: cfg.accessTtl });
}

async function issueRefresh(userId, tenantId) {
  const token = crypto.randomBytes(48).toString('hex');
  await db('refresh_tokens').insert({
    user_id: userId,
    tenant_id: tenantId,
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + cfg.refreshTtlDays * 864e5),
  });
  return token;
}

// Rota el refresh token: invalida el recibido y emite uno nuevo.
async function rotateRefresh(token) {
  const row = await db('refresh_tokens').where({ token_hash: sha256(token) }).first();
  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) return null;
  await db('refresh_tokens').where({ id: row.id }).update({ revoked_at: db.fn.now() });
  return { userId: row.user_id, tenantId: row.tenant_id, refresh: await issueRefresh(row.user_id, row.tenant_id) };
}

async function revokeRefresh(token) {
  await db('refresh_tokens').where({ token_hash: sha256(token) }).update({ revoked_at: db.fn.now() });
}

// Contexto completo del usuario dentro de una empresa: rol, permisos y módulos.
async function loadContext(userId, tenantId) {
  const user = await db('users').where({ id: userId, active: true }).first();
  if (!user) return null;
  const tenant = await db('tenants').where({ id: tenantId, active: true }).first();
  const membership = tenant && (await db('memberships').where({ user_id: userId, tenant_id: tenantId }).first());
  // El dueño de la plataforma puede entrar a cualquier empresa como soporte, sin ser miembro.
  const support = !!tenant && !membership && !!user.is_platform_admin;
  if (!membership && !support) return null;
  const role = support ? { name: 'Soporte de plataforma' } : await db('roles').where({ id: membership.role_id }).first();
  const permissions = support
    ? Object.keys(PERMISSIONS)
    : (await db('role_permissions').where({ role_id: role.id })).map((r) => r.permission_key);
  const modules = (await db('tenant_modules').where({ tenant_id: tenantId, enabled: true })).map((m) => m.module_key);
  return {
    user: { id: user.id, name: user.name, email: user.email, isPlatformAdmin: !!user.is_platform_admin },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, subscription: subscriptionState(tenant) },
    role: role.name,
    supportMode: support,
    permissions,
    modules,
  };
}

async function listTenantsOf(userId) {
  return db('memberships as m')
    .join('tenants as t', 't.id', 'm.tenant_id')
    .where({ 'm.user_id': userId, 't.active': true })
    .select('t.id', 't.name', 't.slug');
}

module.exports = { signAccess, issueRefresh, rotateRefresh, revokeRefresh, loadContext, listTenantsOf };
