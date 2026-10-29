# Koudmin

Les extras péi, en 2 heures.

Monorepo pnpm + Turborepo.

| Dossier | Contenu |
|---|---|
| `apps/extra` | App mobile extras (Expo SDK 58, Expo Router) |
| `apps/resto` | Site restaurateur (Next.js App Router, CSS Modules) — étape d |
| `packages/ui-tokens` | Charte : couleurs, typo, rayons, espacements. TS pour React Native, `dist/tokens.css` pour le web |
| `packages/core` | Logique métier testée : salaire, formats, dates (La Réunion), tri des missions, machine d'états « Mi lé la », téléphone +262, textes |
| `supabase/` | Schéma, sécurité (RLS), fonctions `missions_disponibles` / `accepter_mission` / `se_desister`, données fictives, numéros de test +262 |
| `design_handoff_koudmin/` | Maquettes de référence (corrigées : 162,50 €, textes neutres) |

## Commandes

```bash
pnpm install
pnpm test        # tests unitaires
pnpm typecheck
pnpm build       # génère packages/ui-tokens/dist/tokens.css
scripts/verifier-sql.sh   # migration + seed + scénario SQL sur un Postgres local, sans Docker
```

### App extra

```bash
cd apps/extra
pnpm start       # Expo (données fictives tant que EXPO_PUBLIC_SUPABASE_* est vide)
pnpm web         # aperçu navigateur
```

États forcés pour la démo : `/?demo=chargement`, `/?demo=vide`, `/?demo=horsLigne`.

Polices : Bricolage Grotesque est figée par taille optique (`packages/ui-tokens/scripts/instancier-polices.py`), Figtree reçoit le glyphe « ≈ » qui lui manque (`apps/extra/scripts/ajouter-approx.py`). Elles sont intégrées au build natif par le plugin `expo-font`.

### Supabase en local

```bash
cp supabase/.env.example supabase/.env
npx supabase start   # nécessite Docker
```

Comptes de test (code SMS `123456`) : extra `0692 00 00 01` (Kévin), restaurateur `0693 00 00 01` (Le Boucan Grillé).

## Règles

- Le taux horaire brut (SMIC) et les frais Koudmin viennent de la table `parametres` (date d'effet) et sont figés sur chaque demande. Aucune valeur en dur dans le code.
- Calculs en entiers : minutes et centimes. Brut par extra arrondi au centime, puis × nombre d'extras.
- Tous les textes partagés sont dans `packages/core/src/textes.ts`, vérifiés par test (pas de « ! », pas d'émoji, pas d'âge, formes neutres).

## Synchronisation app ↔ site

L'app extra et le site restaurateur lisent et écrivent la même base Supabase. Les types et statuts communs sont dans `packages/core/src/domaine.ts`. Les changements (demande publiée, mission acceptée, désistement) sont poussés en temps réel aux deux côtés via Supabase Realtime.
