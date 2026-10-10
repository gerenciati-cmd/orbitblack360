const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { stripe, syncSubscription } = require('../billing');
const { PLANS, planOf, priceIdOf } = require('../plans');
const { requirePermission } = require('../middleware/auth');
const { audit } = require('../audit');

const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const notConfigured = (res) => res.status(503).json({ error: 'El cobro en línea aún no está configurado' });

// Estado de la suscripción, uso del plan y planes disponibles.
router.get('/', requirePermission('tenant.manage'), async (req, res) => {
  const { tenant } = req.ctx;
  const plan = planOf(tenant.plan);
  const { n } = await db('memberships').where({ tenant_id: tenant.id }).count({ n: '*' }).first();
  res.json({
    configured: !!stripe(),
    plan: { key: tenant.plan, name: plan.name, maxUsers: plan.maxUsers },
    subscription: tenant.subscription,
    usage: { users: Number(n) },
    plans: Object.entries(PLANS).map(([key, p]) => ({ key, name: p.name, maxUsers: p.maxUsers, modules: p.modules, available: !!priceIdOf(key) })),
  });
});

router.post('/checkout', requirePermission('tenant.manage'), async (req, res) => {
  const s = stripe();
  if (!s) return notConfigured(res);
  const parsed = z.object({ plan: z.enum(Object.keys(PLANS)) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Plan inválido' });
  const price = priceIdOf(parsed.data.plan);
  if (!price) return res.status(400).json({ error: 'Ese plan aún no está disponible para contratar' });

  const tenant = await db('tenants').where({ id: req.ctx.tenant.id }).first();
  let customer = tenant.stripe_customer_id;
  if (!customer) {
    customer = (await s.customers.create({ name: tenant.name, email: req.ctx.user.email, metadata: { tenant_id: String(tenant.id) } })).id;
    await db('tenants').where({ id: tenant.id }).update({ stripe_customer_id: customer });
  }
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: String(tenant.id),
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { tenant_id: String(tenant.id), plan: parsed.data.plan } },
    success_url: `${appUrl()}/facturacion?ok=1`,
    cancel_url: `${appUrl()}/facturacion`,
  });
  await audit(req.ctx, { module: 'billing', entity: 'tenants', recordId: tenant.id, action: 'checkout', detail: parsed.data.plan });
  res.json({ url: session.url });
});

// Portal de Stripe: cambiar tarjeta, ver facturas, cambiar de plan o cancelar.
router.post('/portal', requirePermission('tenant.manage'), async (req, res) => {
  const s = stripe();
  if (!s) return notConfigured(res);
  const tenant = await db('tenants').where({ id: req.ctx.tenant.id }).first();
  if (!tenant.stripe_customer_id) return res.status(400).json({ error: 'Aún no tienes una suscripción de pago' });
  const session = await s.billingPortal.sessions.create({ customer: tenant.stripe_customer_id, return_url: `${appUrl()}/facturacion` });
  res.json({ url: session.url });
});

// Webhook de Stripe. Se monta con body crudo (la firma se calcula sobre los bytes exactos).
async function webhook(req, res) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return notConfigured(res);

  let event;
  try {
    event = s.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch {
    return res.status(400).json({ error: 'Firma inválida' });
  }

  // Idempotencia: Stripe reintenta; cada evento se procesa una sola vez.
  try {
    await db('stripe_events').insert({ id: event.id, type: event.type });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.json({ received: true, duplicate: true });
    throw err;
  }

  try {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed' && obj.mode === 'subscription' && obj.subscription) {
      await syncSubscription(await s.subscriptions.retrieve(typeof obj.subscription === 'string' ? obj.subscription : obj.subscription.id));
    } else if (event.type.startsWith('customer.subscription.')) {
      await syncSubscription(obj);
    }
  } catch (err) {
    // Si falla el procesamiento se libera el evento para que el reintento de Stripe lo vuelva a intentar.
    await db('stripe_events').where({ id: event.id }).del();
    throw err;
  }
  res.json({ received: true });
}

module.exports = { router, webhook };
