const db = require('./db');
const { MODULES, DEFAULT_ROLES } = require('./permissions');

// Crea una empresa con sus roles base y módulos activos. Devuelve { tenant, adminRoleId }.
async function createTenant(trx, { name, slug, plan = 'basic' }) {
  const [tenantId] = await trx('tenants').insert({ name, slug, plan });
  let adminRoleId;
  for (const [roleName, perms] of Object.entries(DEFAULT_ROLES)) {
    const [roleId] = await trx('roles').insert({ tenant_id: tenantId, name: roleName, is_system: true });
    if (roleName === 'Administrador') adminRoleId = roleId;
    if (perms.length) await trx('role_permissions').insert(perms.map((p) => ({ role_id: roleId, permission_key: p })));
  }
  await trx('tenant_modules').insert(Object.keys(MODULES).map((m) => ({ tenant_id: tenantId, module_key: m })));
  return { tenantId, adminRoleId };
}

async function syncPermissionCatalog(knex = db) {
  const { PERMISSIONS } = require('./permissions');
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await knex('permissions').insert({ key, description }).onConflict('key').merge();
  }
}

module.exports = { createTenant, syncPermissionCatalog };
