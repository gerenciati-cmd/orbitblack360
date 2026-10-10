const db = require('./db');

// Estaciones (aeropuertos) que el usuario puede operar: null = todas.
async function allowedAirports(ctx) {
  if (ctx.permissions.includes('stations.all')) return null;
  const rows = await db('user_airports').where({ tenant_id: ctx.tenant.id, user_id: ctx.user.id });
  return rows.map((r) => r.airport_id);
}

// Devuelve la fila solo si pertenece a la empresa; evita referenciar datos de otro cliente.
const owned = (table, id, tenantId, trx = db) => trx(table).where({ id, tenant_id: tenantId }).first();

module.exports = { allowedAirports, owned };
