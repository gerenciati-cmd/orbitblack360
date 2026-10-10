// Módulo de operaciones (réplica funcional de traken): catálogos geográficos y comerciales + órdenes de servicio.
// Toda tabla lleva tenant_id: cada empresa cliente tiene sus propios catálogos y órdenes.
const NEW_PERMISSIONS = {
  'catalogs.read': 'Ver catálogos',
  'catalogs.manage': 'Administrar catálogos',
  'orders.read': 'Ver órdenes de servicio',
  'orders.create': 'Crear órdenes de servicio',
  'orders.close': 'Cerrar y reabrir órdenes de servicio',
  'orders.out_of_period': 'Crear órdenes fuera del periodo permitido',
  'stations.all': 'Ver todas las estaciones (sin restricción por usuario)',
};
const NEW_MODULES = ['catalogs', 'orders'];

const tenantRef = (t) => t.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE');
const ref = (t, col, table, nullable = false) => {
  const c = t.integer(col).unsigned();
  if (!nullable) c.notNullable();
  c.references(`${table}.id`);
};

exports.up = async (knex) => {
  await knex.schema.createTable('countries', (t) => {
    t.increments('id');
    tenantRef(t);
    t.string('name', 120).notNullable();
    t.string('code', 10).notNullable().defaultTo('');
    t.unique(['tenant_id', 'name']);
  });

  await knex.schema.createTable('cities', (t) => {
    t.increments('id');
    tenantRef(t);
    ref(t, 'country_id', 'countries');
    t.string('name', 120).notNullable();
    t.string('iata', 10).notNullable().defaultTo('');
    t.boolean('active').notNullable().defaultTo(true);
    t.unique(['tenant_id', 'name']);
  });

  await knex.schema.createTable('airports', (t) => {
    t.increments('id');
    tenantRef(t);
    ref(t, 'country_id', 'countries');
    ref(t, 'city_id', 'cities');
    t.string('name', 160).notNullable();
    t.string('iata', 10).notNullable().defaultTo('');
    t.integer('next_folio').unsigned().notNullable().defaultTo(1); // folio consecutivo por aeropuerto
    t.boolean('active').notNullable().defaultTo(true);
    t.unique(['tenant_id', 'name']);
  });

  await knex.schema.createTable('airlines', (t) => {
    t.increments('id');
    tenantRef(t);
    t.string('name', 120).notNullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.unique(['tenant_id', 'name']);
  });

  // Qué aerolíneas opera cada aeropuerto y con qué esquema de tarifa.
  await knex.schema.createTable('airline_airports', (t) => {
    t.increments('id');
    tenantRef(t);
    ref(t, 'airline_id', 'airlines');
    ref(t, 'airport_id', 'airports');
    t.string('currency', 10).notNullable().defaultTo('MXN');
    t.tinyint('system_rate').notNullable().defaultTo(1);
    t.string('type_rate', 10).notNullable().defaultTo('all'); // all | ep
    t.unique(['airline_id', 'airport_id']);
  });

  for (const name of ['hotel_categories', 'hotel_zones']) {
    await knex.schema.createTable(name, (t) => {
      t.increments('id');
      tenantRef(t);
      t.string('name', 80).notNullable();
      t.unique(['tenant_id', 'name']);
    });
  }

  await knex.schema.createTable('hotels', (t) => {
    t.increments('id');
    tenantRef(t);
    ref(t, 'airport_id', 'airports');
    ref(t, 'city_id', 'cities');
    ref(t, 'category_id', 'hotel_categories', true);
    ref(t, 'zone_id', 'hotel_zones', true);
    t.string('name', 160).notNullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.unique(['tenant_id', 'airport_id', 'name']);
  });

  await knex.schema.createTable('transports', (t) => {
    t.increments('id');
    tenantRef(t);
    ref(t, 'airport_id', 'airports');
    ref(t, 'city_id', 'cities');
    t.string('name', 160).notNullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.unique(['tenant_id', 'airport_id', 'name']);
  });

  await knex.schema.createTable('event_types', (t) => {
    t.increments('id');
    tenantRef(t);
    t.string('name', 120).notNullable();
    // Eventos (p. ej. cortesía) que sí pueden registrarse con fechas de meses anteriores.
    t.boolean('exempt_period').notNullable().defaultTo(false);
    t.unique(['tenant_id', 'name']);
  });

  // Restringe qué estaciones ve cada usuario (salvo quien tenga el permiso stations.all).
  await knex.schema.createTable('user_airports', (t) => {
    tenantRef(t);
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    ref(t, 'airport_id', 'airports');
    t.primary(['tenant_id', 'user_id', 'airport_id']);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id');
    tenantRef(t);
    ref(t, 'airport_id', 'airports');
    t.integer('folio').unsigned().notNullable();
    t.string('prefix', 20).notNullable();
    t.string('flight', 40).notNullable().defaultTo('');
    ref(t, 'event_type_id', 'event_types');
    ref(t, 'airline_id', 'airlines');
    t.date('date_in').notNullable();
    t.date('date_out').notNullable();
    t.string('hour', 5).notNullable().defaultTo('');
    t.integer('created_by').unsigned().notNullable().references('users.id');
    t.string('status', 10).notNullable().defaultTo('open'); // open | close
    t.timestamp('closed_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'airport_id', 'folio']);
    t.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('order_hotels', (t) => {
    t.increments('id');
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    ref(t, 'hotel_id', 'hotels');
    t.integer('rooms').unsigned().notNullable().defaultTo(0);
    t.integer('rooms_available').unsigned().notNullable().defaultTo(0);
  });

  await knex.schema.createTable('order_comments', (t) => {
    t.increments('id');
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('users.id');
    t.text('comment').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('audit_log', (t) => {
    t.increments('id');
    tenantRef(t);
    t.integer('user_id').unsigned().nullable();
    t.string('module', 40).notNullable();
    t.string('entity', 60).notNullable();
    t.string('record_id', 60).notNullable();
    t.string('action', 40).notNullable();
    t.text('detail').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['tenant_id', 'module', 'created_at']);
  });

  // Empresas ya existentes: registrar permisos, activar módulos y dárselos al rol Administrador.
  for (const [key, description] of Object.entries(NEW_PERMISSIONS)) {
    await knex('permissions').insert({ key, description }).onConflict('key').merge();
  }
  const tenants = await knex('tenants').select('id');
  for (const { id } of tenants) {
    await knex('tenant_modules').insert(NEW_MODULES.map((m) => ({ tenant_id: id, module_key: m }))).onConflict(['tenant_id', 'module_key']).ignore();
    const admin = await knex('roles').where({ tenant_id: id, name: 'Administrador' }).first();
    if (admin) {
      await knex('role_permissions')
        .insert(Object.keys(NEW_PERMISSIONS).map((p) => ({ role_id: admin.id, permission_key: p })))
        .onConflict(['role_id', 'permission_key']).ignore();
    }
  }
};

exports.down = async (knex) => {
  for (const t of ['audit_log', 'order_comments', 'order_hotels', 'orders', 'user_airports', 'event_types', 'transports', 'hotels', 'hotel_zones', 'hotel_categories', 'airline_airports', 'airlines', 'airports', 'cities', 'countries']) {
    await knex.schema.dropTableIfExists(t);
  }
  await knex('permissions').whereIn('key', Object.keys(NEW_PERMISSIONS)).del();
  await knex('tenant_modules').whereIn('module_key', NEW_MODULES).del();
};
