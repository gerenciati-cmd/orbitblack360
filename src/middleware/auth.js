const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { loadContext } = require('../auth');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'No autenticado' });
  let payload;
  try {
    payload = jwt.verify(header.slice(7), jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  const ctx = await loadContext(payload.sub, payload.tid);
  if (!ctx) return res.status(401).json({ error: 'Sesión inválida' });
  req.ctx = ctx;
  next();
}

const requirePermission = (key) => (req, res, next) =>
  req.ctx.permissions.includes(key) ? next() : res.status(403).json({ error: 'Sin permiso' });

const requirePlatformAdmin = (req, res, next) =>
  req.ctx.user.isPlatformAdmin ? next() : res.status(403).json({ error: 'Solo administrador de plataforma' });

module.exports = { requireAuth, requirePermission, requirePlatformAdmin };
