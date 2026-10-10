# OrbitBlack360

Node.js. Despliegue en GoDaddy desde la rama `produccion`.

## Ramas
- `main`: trabajo diario. Un push aquí NO afecta al servidor.
- `produccion`: la que está conectada a GoDaddy. Solo se actualiza con `npm run release`.

## Local
    npm start        # usa PORT del entorno o 3000

## Publicar
    npm run release -- v0.1.1
Luego, en el panel de GoDaddy, Implementar.

## Rollback
    git checkout produccion
    git reset --hard v0.1.0
    git push --force-with-lease origin produccion
Luego Implementar en GoDaddy.
