// Crea permisos, la empresa inicial (interna) y el dueño de la plataforma. Idempotente.
const bcrypt = require('bcryptjs');
const db = require('./db');
const { createTenant, syncPermissionCatalog } = require('./tenants');

async function seedOwner({ email, password }) {
  email = (email || '').toLowerCase();
  if (!email || !password || password === 'cambia-esto-ya') throw new Error('Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD');

  await syncPermissionCatalog(db);

  let tenant = await db('tenants').where({ slug: 'demo' }).first();
  let adminRoleId;
  if (!tenant) {
    await db.transaction(async (trx) => {
      const r = await createTenant(trx, { name: 'Empresa Demo', slug: 'demo', plan: 'enterprise' });
      await trx('tenants').where({ id: r.tenantId }).update({ kind: 'internal' });
      tenant = { id: r.tenantId };
      adminRoleId = r.adminRoleId;
    });
  } else {
    adminRoleId = (await db('roles').where({ tenant_id: tenant.id, name: 'Administrador' }).first()).id;
  }

  let user = await db('users').where({ email }).first();
  if (!user) {
    const [id] = await db('users').insert({
      name: 'Administrador',
      email,
      password_hash: await bcrypt.hash(password, 12),
      is_platform_admin: true,
    });
    user = { id };
  }
  if (!(await db('memberships').where({ user_id: user.id, tenant_id: tenant.id }).first())) {
    await db('memberships').insert({ user_id: user.id, tenant_id: tenant.id, role_id: adminRoleId });
  }
  return email;
}

module.exports = { seedOwner };
