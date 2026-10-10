// Núcleo multi-empresa: tenants, usuarios, roles/permisos, módulos por empresa y sesiones.
exports.up = async (knex) => {
  await knex.schema.createTable('tenants', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable();
    t.string('slug', 60).notNullable().unique();
    t.string('plan', 30).notNullable().defaultTo('basic');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('email', 190).notNullable().unique();
    t.string('name', 120).notNullable();
    t.string('password_hash', 100).notNullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.boolean('is_platform_admin').notNullable().defaultTo(false);
    t.timestamp('last_login_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('permissions', (t) => {
    t.string('key', 80).primary();
    t.string('description', 200).notNullable();
  });

  await knex.schema.createTable('roles', (t) => {
    t.increments('id');
    t.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE');
    t.string('name', 60).notNullable();
    t.boolean('is_system').notNullable().defaultTo(false);
    t.unique(['tenant_id', 'name']);
  });

  await knex.schema.createTable('role_permissions', (t) => {
    t.integer('role_id').unsigned().notNullable().references('roles.id').onDelete('CASCADE');
    t.string('permission_key', 80).notNullable().references('permissions.key').onDelete('CASCADE');
    t.primary(['role_id', 'permission_key']);
  });

  await knex.schema.createTable('memberships', (t) => {
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE');
    t.integer('role_id').unsigned().notNullable().references('roles.id');
    t.primary(['user_id', 'tenant_id']);
  });

  // Qué módulos del CRM tiene activos cada empresa (base para vender por paquetes).
  await knex.schema.createTable('tenant_modules', (t) => {
    t.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE');
    t.string('module_key', 60).notNullable();
    t.boolean('enabled').notNullable().defaultTo(true);
    t.primary(['tenant_id', 'module_key']);
  });

  await knex.schema.createTable('refresh_tokens', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE');
    t.string('token_hash', 64).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  for (const t of ['refresh_tokens', 'tenant_modules', 'memberships', 'role_permissions', 'roles', 'permissions', 'users', 'tenants']) {
    await knex.schema.dropTableIfExists(t);
  }
};
