const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { requireAuth, requirePlatformAdmin } = require('./middleware/auth');
const { requireSubscription, requireModule } = require('./middleware/gates');
const billing = require('./routes/billing');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

// El webhook de Stripe necesita el body crudo para verificar la firma: va ANTES de express.json().
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), billing.webhook);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/billing', requireAuth, billing.router);
app.use('/api/platform', requireAuth, requirePlatformAdmin, require('./routes/platform'));

// API de negocio: autenticada, con suscripción vigente y con el módulo incluido en el plan.
const business = (module) => [requireAuth, requireSubscription, requireModule(module)];
app.use(['/api/users', '/api/roles'], ...business('users'));
app.use('/api/catalogs', ...business('catalogs'));
app.use('/api/orders', ...business('orders'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/catalogs'));
app.use('/api', require('./routes/orders'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado' }));

// Frontend React compilado (web/dist), con fallback a index.html para el router del cliente.
const dist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('<h1>OrbitBlack360</h1><p>API activa. Frontend sin compilar (npm run build).</p>'));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

module.exports = app;
