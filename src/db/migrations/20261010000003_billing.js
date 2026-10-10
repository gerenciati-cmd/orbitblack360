// Suscripciones: estado de cobro por empresa e historial de eventos de Stripe (idempotencia).
exports.up = async (knex) => {
  await knex.schema.alterTable('tenants', (t) => {
    // Las empresas existentes (p. ej. la demo interna) quedan activas; las nuevas se crean con prueba.
    t.string('subscription_status', 20).notNullable().defaultTo('active'); // trialing | active | past_due | canceled | suspended
    t.timestamp('trial_ends_at').nullable();
    t.timestamp('current_period_end').nullable();
    t.string('stripe_customer_id', 64).nullable().unique();
    t.string('stripe_subscription_id', 64).nullable().unique();
  });

  await knex.schema.createTable('stripe_events', (t) => {
    t.string('id', 80).primary();
    t.string('type', 80).notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('stripe_events');
  await knex.schema.alterTable('tenants', (t) => {
    t.dropColumn('subscription_status');
    t.dropColumn('trial_ends_at');
    t.dropColumn('current_period_end');
    t.dropColumn('stripe_customer_id');
    t.dropColumn('stripe_subscription_id');
  });
};
