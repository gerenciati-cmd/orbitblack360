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

## Agregar un módulo nuevo
1. Migración en `src/db/migrations/` (con `tenant_id`).
2. Permisos y módulo en `src/permissions.js`.
3. Rutas en `src/routes/` y registro en `src/app.js`.
4. Página en `web/src/pages/`, ruta en `web/src/App.jsx` (con `<Gate>`) y entrada en `NAV` de `Layout.jsx`.

## Publicar
    npm run release -- v0.1.1
Luego, en el panel de GoDaddy, Implementar. Variables de entorno de producción (JWT_SECRET, DB_*) se configuran en el panel, no en el repo.

## Rollback
    git checkout produccion
    git reset --hard v0.1.0
    git push --force-with-lease origin produccion
Luego Implementar en GoDaddy.
