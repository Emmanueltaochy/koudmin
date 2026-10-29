// Copie le logo (pilule basalte, version application) depuis packages/brand en module TS.
// À relancer si le logo change : node scripts/logo-vers-ts.cjs
const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '../../../packages/brand/svg/logo-pilule-basalte.svg');
const sortie = path.join(__dirname, '../src/ui/logoSvg.ts');
const svg = fs.readFileSync(source, 'utf8').trim();
const m = /viewBox="([\d.\s-]+)"/.exec(svg);
if (!m) throw new Error('viewBox introuvable');
const [, , l, h] = m[1].trim().split(/\s+/).map(Number);
fs.writeFileSync(
  sortie,
  `// Généré par scripts/logo-vers-ts.cjs depuis packages/brand : ne pas modifier à la main.\n` +
    `export const LOGO_SVG = ${JSON.stringify(svg)};\n` +
    `export const LOGO_RATIO = ${(l / h).toFixed(4)};\n`,
);
console.log(`logoSvg.ts écrit (ratio ${(l / h).toFixed(3)})`);
