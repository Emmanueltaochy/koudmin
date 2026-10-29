// Rend les SVG de ../svg en PNG aux tailles des icônes, avec Chromium (Playwright).
// Usage : NODE_PATH=$(npm root -g) node scripts/rasteriser.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const SVG = path.join(__dirname, '..', 'svg');
const PNG = path.join(__dirname, '..', 'png');

// [fichier SVG, côté en px, fichier PNG, fond transparent]
const RENDUS = [
  ['monogramme.svg', 1024, 'icon-1024.png', false],
  ['monogramme-avant-plan.svg', 1024, 'android-avant-plan-1024.png', true],
  ['monogramme-monochrome.svg', 1024, 'android-monochrome-1024.png', true],
  ['monogramme.svg', 180, 'apple-icon-180.png', false],
  ['favicon.svg', 48, 'favicon-48.png', true],
  ['favicon.svg', 32, 'favicon-32.png', true],
  ['favicon.svg', 16, 'favicon-16.png', true],
];

(async () => {
  fs.mkdirSync(PNG, { recursive: true });
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  for (const [svg, cote, png, transparent] of RENDUS) {
    const contenu = fs.readFileSync(path.join(SVG, svg), 'utf8');
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><div style="width:${cote}px;height:${cote}px">${contenu.replace('<svg ', `<svg width="${cote}" height="${cote}" `)}</div></body></html>`,
    );
    await page.screenshot({ path: path.join(PNG, png), clip: { x: 0, y: 0, width: cote, height: cote }, omitBackground: transparent });
    console.log(png);
  }
  await navigateur.close();
})();
