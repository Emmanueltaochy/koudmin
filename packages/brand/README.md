# @koudmin/brand

Logo « Point pilule », monogramme et icônes, vectorisés depuis Bricolage Grotesque
(wght 700, opsz 96, wdth 100, interlettrage -0,045 em). Un seul tracé maître pour
toutes les tailles à partir de 110 px. Aucun texte dans les SVG : uniquement des tracés.

## Fichiers (`svg/`)

| Fichier | Usage |
|---|---|
| `logo-pilule-piment.svg` | Basalte, pilule piment. Publicités, réseaux sociaux, imprimés |
| `logo-pilule-basalte.svg` | Tout basalte. Application, e-mails, contrats, factures (le bouton d'action reste le seul élément piment) |
| `logo-creme-sur-piment.svg` | Fond piment (élément piment du visuel), mot et pilule creme |
| `logo-creme-sur-basalte.svg` | Fond basalte, mot creme, pilule piment |
| `monogramme.svg` | K creme sur piment, pilule creme au-dessus de la barre verticale. Icône d'app, avatars |
| `favicon.svg` | K seul, sans pilule (à 32 px elle ferait 3 px de haut) |
| `monogramme-avant-plan.svg`, `monogramme-monochrome.svg` | Icône adaptative Android (sans fond, dans le cercle sûr) |

Les versions sur fond incluent la zone de protection dans le fichier.

## Règles d'usage

- **Pilule piment** : publicités, réseaux sociaux, imprimés. **Pilule basalte** : application, e-mails, documents.
- **Taille minimale** : 110 px de large à l'écran, 25 mm imprimé. En dessous, utiliser le monogramme.
- **Zone de protection** : la hauteur du « o » tout autour du logo.
- Interdits : déformer, dégradé, sur photo chargée, couleur hors charte.

## Régénérer

```bash
pnpm --filter @koudmin/brand generer
```

1. `scripts/generer.py` : SVG (fontTools + HarfBuzz, géométrie CSS des maquettes) ;
2. `scripts/rasteriser.cjs` : PNG avec Chromium (Playwright) ;
3. `scripts/installer.py` : `favicon.ico` (16, 32, 48) et copie vers `apps/extra/assets` et `apps/resto/public/brand`.
