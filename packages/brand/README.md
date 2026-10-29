# @kivien/brand

Logo « kivien », monogramme « ki », favicon et icônes, vectorisés depuis Bricolage Grotesque
(wght 700, opsz 96, wdth 100, interlettrage -0,04 em). Un seul tracé maître pour toutes les
tailles à partir de 80 px. Aucun texte dans les SVG : uniquement des tracés.

Le mot s'écrit en minuscules. Le premier « i » garde son point rond ; le point du second « i »
devient une pilule (0,24 × 0,13 em, rayon plein, à 0,09 em du haut, marge 0,015 em de chaque
côté du « ı »). **Une seule pilule, jamais deux.** « Kivien » prend une majuscule dans le texte courant.

## Fichiers (`svg/`)

| Fichier | Usage |
|---|---|
| `logo-pilule-piment.svg` | Basalte, pilule piment. Publicités, réseaux sociaux, imprimés, site vitrine |
| `logo-pilule-basalte.svg` | Tout basalte. Application, e-mails, contrats, factures (le bouton d'action reste le seul élément piment) |
| `logo-creme-sur-piment.svg` | Fond piment (élément piment du visuel), mot et pilule creme |
| `logo-creme-sur-basalte.svg` | Fond basalte, mot creme, pilule piment (fonds sombres, bannières) |
| `monogramme.svg` | « ki » creme sur piment, pilule sur le « i ». Icône d'app 1024, avatars |
| `favicon.svg` | « k » seul, sans pilule (à 32 px elle ferait 3 px de haut) |
| `monogramme-avant-plan.svg`, `monogramme-monochrome.svg` | Icône adaptative Android (sans fond, « ki » dans le cercle sûr central) |

Les logos sans fond ont un `viewBox` serré sur l'encre (pas de zone de protection incluse) ;
les versions sur fond incluent la zone de protection.

## Règles d'usage

- **Pilule piment** : publicités, réseaux sociaux, imprimés. **Pilule basalte** : application, e-mails, documents.
- **Taille minimale** : 80 px de large à l'écran, 20 mm imprimé. En dessous, utiliser le monogramme.
- **Zone de protection** : la hauteur du « n » tout autour du logo.
- **Interdits** : déformer, dégradé, fond chargé, couleur hors charte, deux pilules.

## Régénérer

```bash
pnpm --filter @kivien/brand generer
```

1. `scripts/generer.py` : SVG (fontTools + HarfBuzz, géométrie CSS du composant « Kivien Logo ») ;
   la composition est vérifiée contre les positions mesurées dans Chromium (écart < 1/1000 em) ;
2. `scripts/rasteriser.cjs` : PNG avec Chromium (Playwright) ;
3. `scripts/installer.py` : `favicon.ico` (16, 32, 48) et copie vers `apps/extra/assets`,
   `apps/resto/public/brand` et `apps/resto/app` (icônes Next.js).

Comparaison avec la charte : `docs/captures/logo/`.
