// Distingue empresas internas (tuyas) de clientes a los que se les vende la plataforma.
exports.up = async (knex) => {
  await knex.schema.alterTable('tenants', (t) => {
    t.string('kind', 10).notNullable().defaultTo('customer'); // internal | customer
  });
  await knex('tenants').where({ slug: 'demo' }).update({ kind: 'internal' });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('tenants', (t) => t.dropColumn('kind'));
};
