# OrbitBlack360

Plataforma central multi-empresa (pensada para venderse como CRM/intranet). Node + React + MySQL, instalable como PWA.

## Estructura
- `server.js`, `src/` — API Express 5 (`/api/...`). Auth JWT + refresh rotativo, roles/permisos, multi-empresa.
- `src/db/migrations/` — esquema (Knex). `src/permissions.js` — catálogo de permisos y módulos.
- `web/` — React + Vite + PWA. `npm run build` genera `web/dist`, que Express sirve.
- `scripts/seed.js` — crea la empresa demo y el admin de plataforma. `scripts/release.js` — publicar.

## Ramas
- `main`: trabajo diario. Un push aquí NO afecta al servidor.
- `produccion`: la que está conectada a GoDaddy. Solo se actualiza con `npm run release`.

## Local
    cp .env.example .env          # y completa JWT_SECRET, DB_*, SEED_ADMIN_*
    npm install                   # instala y compila el frontend
    npm run migrate               # crea las tablas (la BD debe existir)
    npm run seed                  # empresa demo + admin
    npm run dev                   # API en :3000
    npm run dev:web               # frontend con recarga en :5173 (proxy a la API)

## Modelo multi-empresa
`tenants` (empresas cliente) → `memberships` (usuario + rol por empresa) → `roles` → `permissions`.
`tenant_modules` define qué módulos tiene activos cada empresa (así se venden por paquetes).
Alta de un cliente nuevo: `POST /api/platform/tenants` (solo admin de plataforma).
Toda tabla de negocio debe llevar `tenant_id` y filtrarse con `req.ctx.tenant.id`.

## Suscripciones (venta del producto)
- Planes en `src/plans.js` (límite de usuarios y módulos incluidos). Los precios viven en Stripe: un Price por plan.
- Registro público en `/registro`: crea la empresa en prueba de 14 días con plan Pro. Al vencer, la API responde 402 y la app solo deja ver Facturación.
- Estados: `trialing`, `active`, `past_due` (conserva acceso con aviso), `canceled`, `suspended`.
- Stripe (Checkout + Portal del cliente) se configura con las variables `STRIPE_*` del `.env.example`.
  El webhook es `POST /api/webhooks/stripe` con los eventos `checkout.session.completed` y `customer.subscription.*`; verifica la firma y es idempotente.
- `/plataforma` (solo admin de plataforma): ver clientes, cambiar plan, suspender/reactivar, extender prueba.
- Al agregar un módulo: decide en qué planes entra (`src/plans.js`) y protege su API con `requireModule` en `src/app.js`.

## Agregar un módulo nuevo
1. Migración en `src/db/migrations/` (con `tenant_id`).
2. Permisos y módulo en `src/permissions.js`.
3. Rutas en `src/routes/` y registro en `src/app.js`.
4. Página en `web/src/pages/`, ruta en `web/src/App.jsx` (con `<Gate>`) y entrada en `NAV` de `Layout.jsx`.

## Base de datos (automática)
Al arrancar, la app (`src/bootstrap.js`) aplica sola las migraciones pendientes y, si la base no tiene usuarios, crea al dueño con `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.
Basta con crear una base MySQL **vacía** y poner las variables `DB_*`; no hay que importar nada. Usa un candado de MySQL, así que varias instancias o un reinicio a mitad de arranque no la dejan atorada.
Si algo falla la app no arranca a medias: escribe `[ARRANQUE FALLIDO]` con el detalle en los registros y sale con error. `AUTO_MIGRATE=false` la desactiva.
Un cambio de estructura nuevo = un archivo en `src/db/migrations/`; se aplica en el siguiente despliegue. `database/schema.sql` solo sirve para montar una base desde cero a mano.

## Publicar
    npm run publicar                     # guarda cambios, revisa que compile, sube a GitHub y actualiza produccion
    npm run publicar -- "mi mensaje"     # con mensaje de commit propio
    npm run publicar -- --minor          # versión menor (también --major)
Se detiene sin publicar si el frontend no compila o si hay archivos privados (.env, *.local.sql, llaves).
Luego, en el panel de GoDaddy: "Actualizar vista previa", revisar, y "Publicar como activo".
Variables de entorno de producción (JWT_SECRET, DB_*) se configuran en la pestaña Secretos del panel, no en el repo.
(`npm run release -- vX.Y.Z` sigue existiendo para publicar con una versión exacta; no hace commit ni compila.)

## Rollback
    git checkout produccion
    git reset --hard v0.1.0
    git push --force-with-lease origin produccion
Luego Implementar en GoDaddy.
