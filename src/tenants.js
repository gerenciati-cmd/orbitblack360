const db = require('./db');
const { DEFAULT_ROLES } = require('./permissions');
const { applyPlan } = require('./billing');

// Crea una empresa con sus roles base y los módulos de su plan. Devuelve { tenantId, adminRoleId }.
// Con trialDays queda en prueba gratuita; sin él, activa (empresas internas o dadas de alta a mano).
async function createTenant(trx, { name, slug, plan = 'basic', trialDays = 0 }) {
  const [tenantId] = await trx('tenants').insert({
    name,
    slug,
    plan,
    subscription_status: trialDays ? 'trialing' : 'active',
    trial_ends_at: trialDays ? new Date(Date.now() + trialDays * 864e5) : null,
  });
  let adminRoleId;
  for (const [roleName, perms] of Object.entries(DEFAULT_ROLES)) {
    const [roleId] = await trx('roles').insert({ tenant_id: tenantId, name: roleName, is_system: true });
    if (roleName === 'Administrador') adminRoleId = roleId;
    if (perms.length) await trx('role_permissions').insert(perms.map((p) => ({ role_id: roleId, permission_key: p })));
  }
  await applyPlan(trx, tenantId, plan);
  return { tenantId, adminRoleId };
}

async function syncPermissionCatalog(knex = db) {
  const { PERMISSIONS } = require('./permissions');
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await knex('permissions').insert({ key, description }).onConflict('key').merge();
  }
}

module.exports = { createTenant, syncPermissionCatalog };
