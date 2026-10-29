# Kivien

Les extras péi, en 2 heures.

Monorepo pnpm + Turborepo.

| Dossier | Contenu |
|---|---|
| `apps/extra` | App mobile extras (Expo SDK 58, Expo Router) |
| `apps/resto` | Site restaurateur (Next.js 16 App Router, CSS Modules, polices locales), 360 → 1440 px |
| `packages/brand` | Logo « Point pilule » en tracés SVG, monogramme, favicon, icônes d'app (script `generer`) |
| `packages/ui-tokens` | Charte : couleurs, typo, rayons, espacements. TS pour React Native, `dist/tokens.css` pour le web |
| `packages/core` | Logique métier testée : salaire, formats, dates (La Réunion), tri des missions, machine d'états « Mi lé la », téléphone +262, textes |
| `supabase/` | Schéma, sécurité (RLS), fonctions `missions_disponibles` / `accepter_mission` / `se_desister`, données fictives, numéros de test +262 |
| `design_handoff_kivien/` | Maquettes de référence (corrigées : 162,50 €, textes neutres) |

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

États forcés pour la démo (données fictives uniquement, ignorés dès que Supabase est branché) :
- liste : `/?demo=chargement`, `/?demo=vide`, `/?demo=horsLigne` ;
- détail : `/mission/d001?demo=envoi`, `?demo=prise`, `?demo=confirmee`, `?demo=desistement`.

Parcours de bout en bout (liste → « Mi lé la » → confirmé → désistement → liste) :

```bash
pnpm --filter @kivien/extra export:web
npx serve -s apps/extra/dist -l 8090
node apps/extra/e2e/parcours.cjs
```

Polices : Bricolage Grotesque est figée par taille optique (`packages/ui-tokens/scripts/instancier-polices.py`), Figtree reçoit le glyphe « ≈ » qui lui manque (`apps/extra/scripts/ajouter-approx.py`). Elles sont intégrées au build natif par le plugin `expo-font`.

### Site restaurateur

```bash
pnpm --filter @kivien/resto build
pnpm --filter @kivien/resto start      # http://localhost:3000, données fictives
node apps/resto/e2e/parcours.cjs        # parcours de bout en bout (Playwright)
```

États forcés du formulaire (données fictives) : `/demande?demo=envoi`, `/demande?demo=erreur`.

### Supabase en local

```bash
cp supabase/.env.example supabase/.env
npx supabase start   # nécessite Docker
```

Comptes de test (mot de passe `kivien974`) : extra `0692 00 00 01` (Kévin), restaurateur `0693 00 00 01` (Le Boucan Grillé).

## Règles

- Le taux horaire brut (SMIC) et les frais Kivien viennent de la table `parametres` (date d'effet) et sont figés sur chaque demande. Aucune valeur en dur dans le code.
- Calculs en entiers : minutes et centimes. Brut par extra arrondi au centime, puis × nombre d'extras.
- Tous les textes partagés sont dans `packages/core/src/textes.ts`, vérifiés par test (pas de « ! », pas d'émoji, pas d'âge, formes neutres).

## Synchronisation app ↔ site

L'app extra et le site restaurateur lisent et écrivent la même base Supabase. Les types et statuts communs sont dans `packages/core/src/domaine.ts`. Les changements (demande publiée, mission acceptée, désistement) sont poussés en temps réel aux deux côtés via Supabase Realtime.

## Écrans

- **Page d'accueil publique** (`/`, maquette « Landing page v3 ») : promesse, étapes, app extras, contrat, témoignages, garanties, tarif, lettre d'information. Montants calculés depuis la table `parametres` (lecture publique), textes dans `packages/core/src/textesVitrine.ts`, liens et photos dans `apps/resto/lib/vitrine/liens.ts`.
- **Restaurateur** (`/espace`) : accueil, demande d'extra, suivi en temps réel, contrat + signature + rappel DPAE, notation, historique, factures, favoris, connexion par mobile et mot de passe.
- **Extra** : inscription (5 champs), connexion, missions disponibles et confirmées, détail + « Mi lé la », désistement, contrat (infos DPAE demandées une seule fois), disponibilités, profil.

Captures et comparaisons avec les maquettes : `docs/captures/`.

## À valider avant la production

- **Page d'accueil** : remplacer les photos de travail (4 sur 6 hors restauration, droits inconnus) par des photos sous licence ou prises sur place ; vrais témoignages avec accord écrit (ou retirer la section) ; logos partenaires avec autorisation ; pages légales (mentions légales, CGV, confidentialité, cookies), liens des stores et adresse bonjour@kivien.re à créer ; la lettre d'information collecte des e-mails : à déclarer dans la politique de confidentialité, avec un vrai lien de désinscription dans chaque envoi.

- **Contrat** (`packages/core/src/contrat.ts`) : modèle de CDD d'usage à faire relire par un juriste en droit du travail.
- **Signature électronique** : tracé + horodatage + compte du signataire (numéro à vérifier par SMS une fois le fournisseur branché). Pour une valeur probante renforcée, brancher un prestataire (eIDAS).
- **Factures** (`apps/resto/lib/identite.ts`) : raison sociale, adresse, SIREN et TVA de Kivien à compléter ; numérotation à générer côté serveur.
- **Données sensibles** : le numéro de sécurité sociale est stocké en base (RLS stricte) ; prévoir un chiffrement au repos dédié.
- **Clôture des missions** : planifier `cloturer_missions()` (pg_cron).
- **SMS** : brancher un fournisseur (Twilio ou autre) pour vérifier les numéros ; d'ici là, connexion par mot de passe (voir `deploy/vps/README.md`).
