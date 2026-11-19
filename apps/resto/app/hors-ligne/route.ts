import { textesEcrans } from '@kivien/core';
import { couleurs } from '@kivien/ui-tokens';

const ti = textesEcrans.resto.installation;
const echapper = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * Page affichée sans connexion par le service worker (public/sw.js). Tout est dans la page (styles
 * compris) : elle doit s'afficher sans rien charger d'autre.
 */
export const dynamic = 'force-static';

export function GET() {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echapper(ti.horsLigneTitre)} · Kivien</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: ${couleurs.creme}; color: ${couleurs.basalte}; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 420px; padding: 32px; }
  h1 { margin: 0 0 12px; font-size: 28px; line-height: 1.2; }
  p { margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: ${couleurs.galet}; }
  button { height: 52px; padding: 0 24px; border: 0; border-radius: 14px; background: ${couleurs.piment}; color: ${couleurs.blanc};
           font: 600 16px system-ui, -apple-system, "Segoe UI", sans-serif; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1>${echapper(ti.horsLigneTitre)}</h1>
  <p>${echapper(ti.horsLigneTexte)}</p>
  <button type="button" onclick="location.reload()">${echapper(ti.reessayer)}</button>
</main>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
