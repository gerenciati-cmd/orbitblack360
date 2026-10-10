const { planOf } = require('../plans');

// Bloquea el uso de la API de negocio si la suscripción no está vigente (el admin de plataforma no se bloquea).
const requireSubscription = (req, res, next) => {
  if (req.ctx.user.isPlatformAdmin || req.ctx.tenant.subscription.allowed) return next();
  res.status(402).json({ error: 'Suscripción inactiva. Renueva tu plan para continuar.', code: 'subscription_inactive' });
};

// El plan de la empresa debe incluir el módulo (no basta con ocultarlo en el frontend).
const requireModule = (key) => (req, res, next) =>
  req.ctx.modules.includes(key) ? next() : res.status(403).json({ error: 'Tu plan no incluye este módulo', code: 'module_not_in_plan' });

// Límite de usuarios según el plan.
async function userLimitReached(db, ctx) {
  const max = planOf(ctx.tenant.plan).maxUsers;
  if (max == null) return false;
  const { n } = await db('memberships').where({ tenant_id: ctx.tenant.id }).count({ n: '*' }).first();
  return Number(n) >= max;
}

module.exports = { requireSubscription, requireModule, userLimitReached };
