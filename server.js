const app = require('./src/app');
const { port } = require('./src/config');
const { bootstrap } = require('./src/bootstrap');

// Si la base no está lista (credenciales mal, migración fallida) no se levanta a medias: se avisa claro y se sale.
bootstrap()
  .then(() => app.listen(port, () => console.log(`OrbitBlack360 escuchando en puerto ${port}`)))
  .catch((err) => {
    console.error('\n[ARRANQUE FALLIDO] No se pudo preparar la base de datos.');
    console.error(`Host: ${process.env.DB_HOST || '127.0.0.1'}  Base: ${process.env.DB_NAME || 'orbitblack360_dev'}  Usuario: ${process.env.DB_USER || 'root'}`);
    console.error(`Detalle: ${err.code ? `${err.code} - ` : ''}${err.message}\n`);
    process.exit(1);
  });
