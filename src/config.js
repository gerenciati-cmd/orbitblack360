require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'cambia-esto')) {
  throw new Error('JWT_SECRET no configurado');
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  accessTtl: '15m',
  refreshTtlDays: 30,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orbitblack360_dev',
  },
};
