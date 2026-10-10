// Planes comerciales. Los precios viven en Stripe (un Price por plan); aquí solo van límites y módulos.
// maxUsers: null = ilimitado. Al agregar un módulo nuevo al producto, decide en qué planes entra.
const ALL = ['dashboard', 'users', 'catalogs', 'orders'];

const PLANS = {
  basic: { name: 'Básico', maxUsers: 5, modules: ['dashboard', 'users', 'catalogs', 'orders'], priceEnv: 'STRIPE_PRICE_BASIC' },
  pro: { name: 'Pro', maxUsers: 25, modules: ALL, priceEnv: 'STRIPE_PRICE_PRO' },
  enterprise: { name: 'Empresarial', maxUsers: null, modules: ALL, priceEnv: 'STRIPE_PRICE_ENTERPRISE' },
};

const TRIAL_DAYS = 14;
const TRIAL_PLAN = 'pro'; // la prueba muestra todo el producto

const planOf = (key) => PLANS[key] || PLANS.basic;
const priceIdOf = (key) => process.env[planOf(key).priceEnv] || null;
const planByPriceId = (priceId) => Object.keys(PLANS).find((k) => priceId && process.env[PLANS[k].priceEnv] === priceId) || null;

// ¿Puede la empresa usar la plataforma ahora? past_due conserva acceso (periodo de gracia) y se avisa en pantalla.
function subscriptionState(t, now = new Date()) {
  const trialEnds = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
  const status = t.subscription_status;
  const trialExpired = status === 'trialing' && trialEnds && trialEnds < now;
  const allowed = ['active', 'past_due'].includes(status) || (status === 'trialing' && !trialExpired);
  return {
    status: trialExpired ? 'expired' : status,
    allowed,
    trialEndsAt: trialEnds,
    currentPeriodEnd: t.current_period_end ? new Date(t.current_period_end) : null,
  };
}

module.exports = { PLANS, TRIAL_DAYS, TRIAL_PLAN, planOf, priceIdOf, planByPriceId, subscriptionState };
