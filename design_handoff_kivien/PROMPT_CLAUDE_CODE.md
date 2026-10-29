Tu vas développer Kivien à partir des maquettes du dossier design_handoff_kivien/.

1. Lis d'abord en entier design_handoff_kivien/README.md (écrans, états, règles métier, textes) et design_handoff_kivien/CHARTE.md (charte graphique). Ce sont les références. Les captures PNG sont dans design_handoff_kivien/captures/. Les fichiers .dc.html sont des maquettes HTML à reproduire, pas du code à reprendre. Pour les voir : `npx serve design_handoff_kivien`, puis ouvre chaque .dc.html (support.js doit rester à côté). Les valeurs exactes (px, hex) sont dans les style="…" inline.

2. Architecture (si tu as une meilleure proposition, dis-le avant de coder) :
   - Monorepo pnpm + Turborepo.
   - apps/extra : application mobile React Native (Expo, TypeScript). Cible : Android d'entrée de gamme, donc légèreté et performance en priorité.
   - apps/resto : site restaurateur Next.js (App Router, TypeScript), responsive de 390 px à 1440 px.
   - packages/ui-tokens : couleurs, typographie, rayons et espacements de CHARTE.md, partagés par les deux apps.
   - packages/core : logique métier partagée et testée (calcul du salaire, formats d'horaires et de montants, tri des missions).
   - Backend : Supabase (auth par téléphone, Postgres, temps réel pour le suivi de mission). Données fictives pour commencer.

3. Règles impératives :
   - Le taux horaire brut (12,31 €, SMIC) est un paramètre de configuration, jamais en dur. Brut = heures × taux × 1,10 ; net estimé = brut × 0,78, arrondi à l'euro. Écris des tests unitaires avec les exemples du README (6 h → 81,25 € brut / ≈ 63 € net, etc.).
   - Un seul élément piment (#C2401E) par écran. Curcuma toujours avec texte basalte. Trait (#E6DCCF) uniquement pour les séparateurs ; bordures de champs en galet.
   - Textes repris à l'identique du README : pas de point d'exclamation, pas d'émoji, créole limité à koudmin / péi / mi lé la.
   - Texte d'au moins 16 px sur mobile, cibles tactiles d'au moins 44 px. Icônes Lucide (lucide-react-native / lucide-react). Polices : Bricolage Grotesque + Figtree.
   - Aucune mention d'âge dans les textes publics.

4. Ordre de travail. Montre-moi le résultat après chaque étape :
   a. Monorepo, tokens et packages/core avec tests.
   b. App extra : Missions disponibles (liste, chargement, vide, hors ligne ; tri : retour assuré d'abord, puis distance).
   c. App extra : Détail mission + « Mi lé la », avec la machine d'états idle → sending → done / taken, et le désistement (cancel).
   d. Site resto : Demande d'extra mobile (rempli, envoi, erreur ; récapitulatif en direct ; case retour décochée par défaut).
   e. Ensuite seulement, les écrans listés « pas encore dessinés » dans le README, dans le même langage visuel. Signale-moi chaque choix de design que tu fais seul.

5. Logo (voir CHARTE.md §1–2 : « kivien » minuscules, pilule unique sur le second « i ») : vectorise en SVG le logotype kivien (pilule sur le second « i ») (versions pilule piment et pilule basalte), puis génère l'icône d'app et le favicon à partir du monogramme, comme indiqué dans CHARTE.md.

Commence par résumer ce que tu as compris et proposer l'arborescence, puis attends mon accord.
