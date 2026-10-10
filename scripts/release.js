// Publica: main -> produccion + tag. Uso: npm run release -- v1.0.1
const { execSync } = require('child_process');
const run = (c) => { console.log('> ' + c); execSync(c, { stdio: 'inherit' }); };
const out = (c) => execSync(c).toString().trim();

const tag = process.argv[2];
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error('Uso: npm run release -- vX.Y.Z');
  process.exit(1);
}
if (out('git status --porcelain')) {
  console.error('Hay cambios sin commitear. Commitea primero.');
  process.exit(1);
}
if (out('git rev-parse --abbrev-ref HEAD') !== 'main') {
  console.error('Ejecuta el release desde la rama main.');
  process.exit(1);
}
run('git push origin main');
run('git checkout produccion');
try {
  run('git merge --ff-only main');
  run(`git tag ${tag}`);
  run('git push origin produccion --tags');
} finally {
  run('git checkout main');
}
console.log(`\nListo. Ahora entra a GoDaddy y da "Implementar" (${tag}).`);
