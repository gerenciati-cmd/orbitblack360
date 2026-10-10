const app = require('./src/app');
const { port } = require('./src/config');
const { syncPermissionCatalog } = require('./src/tenants');

// El catálogo de permisos del código es la fuente de verdad: se sincroniza al arrancar.
syncPermissionCatalog()
  .catch((err) => console.error('No se pudo sincronizar permisos (¿falta migrar?):', err.message))
  .finally(() => app.listen(port, () => console.log(`OrbitBlack360 escuchando en puerto ${port}`)));
