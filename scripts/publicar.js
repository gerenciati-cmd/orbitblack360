// Publica en un solo paso: guarda cambios -> revisa que compile -> sube main -> actualiza produccion + etiqueta.
// Uso:  npm run publicar                      (mensaje automático, versión +0.0.1)
//       npm run publicar -- "mi mensaje"      (mensaje propio)
//       npm run publicar -- --minor           (sube la versión menor: 0.2.0 -> 0.3.0; también --major)
const { execSync } = require('child_process');

const sh = (c, opts = {}) => {
  const out = execSync(c, { stdio: opts.show ? 'inherit' : 'pipe', encoding: 'utf8' });
  return out ? out.toString().trim() : ''; // con stdio 'inherit' execSync devuelve null
};
const show = (c) => { console.log(`> ${c}`); sh(c, { show: true }); };
const fail = (msg) => { console.error(`\nX ${msg}`); process.exit(1); };
process.on('uncaughtException', (e) => fail(`Falló: ${e.cmd || e.message}\nNo se publicó en GoDaddy. Si dudas del estado, corre: git status`));

const args = process.argv.slice(2);
const bump = args.includes('--major') ? 'major' : args.includes('--minor') ? 'minor' : 'patch';
const skipBuild = args.includes('--sin-build');
const message = args.find((a) => !a.startsWith('--')) || `chore: actualizacion ${new Date().toISOString().slice(0, 10)}`;

// Archivos que jamás deben llegar a GitHub.
const FORBIDDEN = [/(^|\/)\.env($|\.)(?!example)/, /\.local\.sql$/, /(^|\/)node_modules\//, /\.pem$/, /\.key$/];

if (sh('git rev-parse --abbrev-ref HEAD') !== 'main') fail('Ejecuta esto desde la rama main (git checkout main).');

// 1) Guardar cambios pendientes
if (sh('git status --porcelain')) {
  sh('git add -A');
  const bad = sh('git diff --cached --name-only').split('\n').filter((f) => FORBIDDEN.some((re) => re.test(f)));
  if (bad.length) {
    sh('git reset');
    fail(`Se detectaron archivos privados que NO se pueden subir:\n  ${bad.join('\n  ')}\nQuítalos o agrégalos a .gitignore y vuelve a intentar.`);
  }
  console.log('Guardando cambios:');
  console.log(sh('git diff --cached --stat').split('\n').map((l) => `  ${l}`).join('\n'));
  sh(`git commit -m ${JSON.stringify(message)}`);
} else {
  console.log('No hay cambios nuevos; se publica lo que ya está en main.');
}

// 2) Que el frontend compile ANTES de tocar producción
if (!skipBuild) {
  console.log('\nRevisando que el frontend compile...');
  try { sh('npm --prefix web run build'); } catch (e) { fail(`El frontend no compila, no se publicó nada:\n${e.stdout || e.message}`); }
  console.log('  ok');
}

// 3) Siguiente versión a partir de la última etiqueta
const last = sh("git tag --list \"v*\" --sort=-v:refname").split('\n').find(Boolean) || 'v0.1.0';
let [maj, min, pat] = last.slice(1).split('.').map(Number);
if (bump === 'major') { maj += 1; min = 0; pat = 0; } else if (bump === 'minor') { min += 1; pat = 0; } else pat += 1;
const tag = `v${maj}.${min}.${pat}`;

// 4) Subir main y actualizar produccion
console.log(`\nPublicando ${tag} (anterior: ${last})`);
show('git push origin main');
show('git checkout produccion');
try {
  try { show('git merge --ff-only main'); } catch { fail('produccion tiene cambios que main no tiene; no se puede avanzar limpio. Avísale a Claude.'); }
  show(`git tag ${tag}`);
  show('git push origin produccion --tags');
} finally {
  show('git checkout main');
}

console.log(`\nListo: ${tag} está en GitHub (rama produccion).`);
console.log('Ahora en GoDaddy: "Actualizar vista previa" -> revisa -> "Publicar como activo".');
