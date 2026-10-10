const path = require('path');
const { db } = require('./src/config');

module.exports = {
  client: 'mysql2',
  connection: { ...db, charset: 'utf8mb4' },
  migrations: { directory: path.join(__dirname, 'src/db/migrations') },
};
