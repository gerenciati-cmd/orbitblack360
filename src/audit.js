const db = require('./db');

// Bitácora de acciones de negocio. Acepta una transacción para quedar atómica con el cambio.
function audit(ctx, { module, entity, recordId, action, detail = null }, trx = db) {
  return trx('audit_log').insert({
    tenant_id: ctx.tenant.id,
    user_id: ctx.user.id,
    module,
    entity,
    record_id: String(recordId),
    action,
    detail,
  });
}

module.exports = { audit };
