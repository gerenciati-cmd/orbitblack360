const Stripe = require('stripe');
const db = require('./db');
const { planOf, planByPriceId } = require('./plans');
const { MODULES } = require('./permissions');

let client = null;
// Stripe es opcional: sin STRIPE_SECRET_KEY el resto de la plataforma funciona y el cobro responde 503.
const stripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
};

// Fija el plan de una empresa y activa exactamente los módulos que ese plan incluye.
async function applyPlan(trx, tenantId, planKey) {
  const plan = planOf(planKey);
  await trx('tenants').where({ id: tenantId }).update({ plan: planKey });
  for (const m of Object.keys(MODULES)) {
    await trx('tenant_modules')
      .insert({ tenant_id: tenantId, module_key: m, enabled: plan.modules.includes(m) })
      .onConflict(['tenant_id', 'module_key']).merge();
  }
}

const STATUS_MAP = {
  active: 'active',
  trialing: 'active', // la prueba de Stripe ya tiene método de pago: se trata como activa
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete_expired: 'canceled',
};

// Refleja una suscripción de Stripe en la empresa correspondiente.
async function syncSubscription(sub) {
  const tenant = sub.metadata?.tenant_id
    ? await db('tenants').where({ id: Number(sub.metadata.tenant_id) }).first()
    : await db('tenants').where({ stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id }).first();
  if (!tenant) return null;

  const status = STATUS_MAP[sub.status];
  if (!status) return tenant.id; // incomplete: aún sin pago, no se cambia nada
  // La fecha de fin de periodo vive en la suscripción o en su primer ítem según la versión de la API.
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const planKey = planByPriceId(sub.items?.data?.[0]?.price?.id) || sub.metadata?.plan || tenant.plan;

  await db.transaction(async (trx) => {
    await trx('tenants').where({ id: tenant.id }).update({
      subscription_status: status,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000) : null,
      trial_ends_at: null,
    });
    // Al cancelar se conserva el plan anterior; el acceso lo corta subscription_status.
    if (status !== 'canceled') await applyPlan(trx, tenant.id, planKey);
  });
  return tenant.id;
}

module.exports = { stripe, applyPlan, syncSubscription };
