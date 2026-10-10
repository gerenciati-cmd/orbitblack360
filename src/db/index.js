const path = require('path');
const knex = require('knex');
const { db } = require('../config');

module.exports = knex({
  client: 'mysql2',
  connection: { ...db, charset: 'utf8mb4' },
  pool: { min: 0, max: 10 },
  migrations: { directory: path.join(__dirname, 'migrations') },
});
