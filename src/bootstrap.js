// Preparación al arrancar: aplica migraciones pendientes, sincroniza permisos y crea al dueño si la base está vacía.
const db = require('./db');
const { syncPermissionCatalog } = require('./tenants');
const { seedOwner } = require('./seed');

const LOCK = 'orbitblack360_bootstrap';

// Candado de MySQL (GET_LOCK) para que solo una instancia prepare la base a la vez. A diferencia del candado
// de knex, MySQL lo libera solo si el proceso muere: un reinicio a mitad de arranque no deja la app atorada.
async function withLock(fn) {
  const conn = await db.client.acquireConnection();
  try {
    const [[row]] = await conn.promise().query('SELECT GET_LOCK(?, 120) AS ok', [LOCK]);
    if (row.ok !== 1) throw new Error('Otra instancia está preparando la base de datos; reintenta en unos segundos');
    return await fn();
  } finally {
    await conn.promise().query('SELECT RELEASE_LOCK(?)', [LOCK]).catch(() => {});
    db.client.releaseConnection(conn);
  }
}

async function prepare() {
  if (process.env.AUTO_MIGRATE !== 'false') {
    // Con el candado en mano, un candado de knex que siga puesto es de un arranque anterior que se cayó.
    await db.migrate.forceFreeMigrationsLock();
    const [batch, applied] = await db.migrate.latest();
    console.log(applied.length ? `Migraciones aplicadas (lote ${batch}): ${applied.join(', ')}` : 'Base de datos al día (sin migraciones pendientes)');
  }

  await syncPermissionCatalog();

  // Primera instalación: sin ningún usuario se crea el dueño con SEED_ADMIN_*. Con usuarios existentes no se toca nada.
  const { n } = await db('users').count({ n: '*' }).first();
  if (Number(n) === 0 && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    const email = await seedOwner({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
    console.log(`Primera instalación: usuario dueño creado (${email})`);
  } else if (Number(n) === 0) {
    console.warn('Base de datos sin usuarios y sin SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD: no podrás iniciar sesión.');
  }
}

const bootstrap = () => withLock(prepare);

module.exports = { bootstrap };
