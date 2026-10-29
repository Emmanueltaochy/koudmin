# Handoff : Koudmin — app extra, site restaurateur, kit de marque

## Overview
Koudmin met en relation les restaurants, hôtels et bars de La Réunion avec des personnes disponibles pour un extra d'une soirée. Signature : « Les extras péi, en 2 heures. »
- Le restaurateur publie un besoin ; Koudmin trouve un extra en 2 h max. Le restaurateur embauche lui-même en contrat d'extra (CDD d'usage), pré-rempli par Koudmin, signé sur téléphone.
- 25 € HT par mise en relation, non facturée si l'extra est absent et non remplacé.
- L'extra ne paie rien, n'a besoin d'aucun statut (pas de SIRET).
- « Mi lé la » (« je suis là » en créole) = le bouton d'acceptation d'une mission côté extra. Ce n'est jamais un nom de marque.

Deux publics :
1. **Restaurateurs** — desktop + mobile, pressés. Vouvoiement, phrases courtes, chiffres en premier.
2. **Extras** — mobile uniquement, souvent Android d'entrée de gamme, beaucoup sans voiture. Tutoiement, direct, chaleureux.

## About the Design Files
Les fichiers `.dc.html` de ce dossier sont des **références de design réalisées en HTML** (maquettes montrant l'apparence et le comportement attendus), **pas du code de production**. La tâche est de **recréer ces écrans dans l'environnement cible** (ex. React Native / Expo ou Flutter pour l'app extra, Next.js pour le site restaurateur) avec ses patterns et bibliothèques. Si aucun projet n'existe encore, choisir le framework le plus adapté (contrainte forte : performance sur Android d'entrée de gamme).

Pour les ouvrir : servir le dossier en local (`npx serve .`) et ouvrir chaque `.dc.html` dans un navigateur (`support.js` doit rester à côté). Le style est entièrement en `style="…"` inline : lire les valeurs directement dans le source.

## Fidelity
**High-fidelity.** Couleurs, typographie, rayons, espacements et textes sont définitifs. Recréer au pixel près. Le texte (copy) est validé par le client : le reprendre à l'identique.

## Périmètre livré / à faire
Livré (maquettes) :
- Site restaurateur, mobile 390 px : **Demande d'extra** (états 1a rempli, 1b envoi, 1c erreur).
- App extra, 390 px : **Missions disponibles** (2a liste, 2b chargement, 2c vide, 2d hors ligne) ; **Détail mission + « Mi lé la »** (3a interactif, 3b envoi, 3c mission déjà prise, 3d confirmée, 3e désistement).
- Kit de marque : logotype (piste 1b « Point pilule »), monogramme, favicon, règles d'usage, visuels réseaux sociaux (2a–2f).

Pas encore dessiné (à concevoir dans le même langage visuel, ou à demander) : accueil restaurateur, suivi de demande, contrat + signature + rappel DPAE (lien URSSAF), notation après mission, historique/factures/favoris, versions desktop 1440 px ; côté extra : inscription (5 champs max), disponibilités, mission confirmée détaillée, profil.

---

## Design Tokens

### Couleurs (strictes)
| Token | Hex | Usage |
|---|---|---|
| creme | `#FBF6EE` | fond de page |
| blanc | `#FFFFFF` | fond des cartes, champs |
| basalte | `#211C18` | texte principal, titres, chips sélectionnées, icônes |
| galet | `#6B6157` | texte secondaire, légendes, **bordures de champs**, icônes secondaires |
| trait | `#E6DCCF` | **séparateurs uniquement** (jamais texte, jamais bordure de champ) |
| piment | `#C2401E` | marque + action principale. **UN SEUL élément piment par écran.** Texte blanc dessus |
| piment-fonce | `#9E3215` | hover du bouton piment, état « envoi » du bouton, liens |
| curcuma | `#F2B33D` | urgence / « Ce soir ». **Toujours texte basalte** |
| vacoa | `#2C7350` | succès (confirmé, retour assuré). Texte blanc dessus |
| braise | `#8A1C12` | erreur, absence non prévenue, désistement |

Interdits : dégradés, émoji, illustrations de personnages, photos de banque d'images, cartes avec bordure colorée à gauche, palette bleu-violet.

### Typographie (Google Fonts)
- **Bricolage Grotesque 700** — titres. Affiche 56/60 (letter-spacing -0.02em), titre 32/38 (-0.01em), sous-titre 22/28 en 600.
- **Figtree** — texte. Corps 16/24 400 (jamais < 16 px sur mobile) ; corps-fort 16/24 600 (horaires, tarifs, adresses) ; bouton 15/20 700 ; légende 13/18 500.
- Bouton « Mi lé la » : exception, Bricolage 700 22/28, letter-spacing 0.01em.

### Formes
- **Pilule** (radius 999px) = forme signature, réservée aux **créneaux horaires** (filtres de jour, horaires présets, horaire en tête du détail mission).
- Cartes et boutons : radius **12px**. Champs, badges, chips de poste : radius **6px**.
- Espacements sur grille 4 px : **4, 8, 16, 32** (+ 12 ponctuel en padding interne).
- Champs : hauteur 48px, bordure 1px galet, fond blanc, padding 0 16px. Erreur : bordure 2px braise.
- Bouton principal : hauteur 56px (64px pour « Mi lé la »), radius 12, piment, texte blanc 15/20 700 ; hover piment-fonce.
- Bouton secondaire : contour 1px basalte, fond transparent, radius 12, hauteur 48.
- Cartes de mission : fond blanc, radius 12, padding 16, gap 8, ombre `0 1px 0 #E6DCCF`.
- Barre d'action en bas d'écran : fond blanc, `border-top:1px solid #E6DCCF`, padding 16px 16px 32px.

### Icônes
Style **Lucide** (au trait, stroke 2, linecap round), en basalte ou galet (vacoa/braise pour succès/erreur). Utilisées : map-pin, clock, calendar, chevron-left, plus, minus, bus, euro, shirt, file-text, wifi-off, alert-circle, check, x, phone, pencil, menu, list, user, arrow-up-right, calendar-x. → utiliser `lucide-react` / `lucide-react-native`.

---

## Règle métier : salaire (paramètre)
- `TAUX_HORAIRE_BRUT` = **12,31 €** = SMIC horaire brut. **Paramètre de configuration**, revalorisé chaque 1er janvier — jamais en dur.
- Brut mission = heures × taux × **1,10** (10 % d'indemnité de congés payés), arrondi au centime.
- Net estimé = brut × **0,78**, arrondi à l'euro, affiché « ≈ 63 € net ».
- Exemples validés : 6 h → 81,25 € brut / ≈ 63 € net ; 4,5 h → 60,93 / ≈ 48 ; 3,5 h → 47,39 / ≈ 37 ; 7 h → 94,79 / ≈ 74.
- Côté extra : **net en gros** (corps-fort), brut en légende : « 81,25 € brut, congés payés compris ».
- Côté restaurateur : champ « Taux horaire brut » prérempli au SMIC ; **min = SMIC** (on peut monter, pas baisser).

---

## Screens / Views

Cadre mobile : 390 px de large, fond creme. Barre d'état 44px (affichage maquette seulement).

### 1. Demande d'extra (restaurateur, mobile)
**But** : publier un besoin en un seul formulaire court.
Layout (colonne, padding latéral 16, gap 32 entre blocs) :
1. Header : « Koudmin » (Bricolage 700 22/28) à gauche, icône menu à droite.
2. Titre « Trouver un extra » (32/38) + « Un extra trouvé en 2 heures maximum. » (16/24 galet).
3. **Poste** — chips radius 6, padding 8×16 : Serveur, Plonge, Commis, Barman, Réception. Sélection unique : fond basalte, texte blanc 600 + icône check. Non sélectionné : fond blanc, bordure 1px galet.
4. **Date** — 3 cases (flex:1, radius 6) : « Ce soir / ven. 30 », « Demain / sam. 31 », « Dimanche / 1er nov. » (légende 13 + corps-fort 16) + case calendrier 48px. « Ce soir » présélectionné.
5. **Horaires** — pilules : « 18 h – minuit » (présélectionnée, fond basalte), « 11 h 30 – 15 h », « Autre ». Dessous : champs Début / Fin (48px, valeur 600), légende calculée « 6 heures de service. »
6. **Taux horaire brut** — champ « 12,31 € » + suffixe « / heure » en galet ; légende « Minimum légal. Vous pouvez le monter, pas le baisser. »
7. **Adresse du service** — champ avec icône map-pin ; puis **case à cocher DÉCOCHÉE par défaut** (24px, radius 6, bordure galet) : « Je peux raccompagner ou payer le taxi du retour » + légende « Facultatif. Votre demande passe en tête pour les extras sans voiture. »
8. **Nombre d'extras** — label + légende « 25 € HT par extra » ; stepper (−, valeur, +) boutons 48×48, contour galet, radius 12.
9. **Consignes** (« Facultatif ») — textarea min-height 96, placeholder « Tenue, parking, entrée du personnel ».
10. Barre d'action (fond blanc) :
   - « Salaires bruts estimés » … **162,50 €** (brut arrondi au centime par extra, puis × nombre d'extras) ; légende « 2 × 6 h × 12,31 €, + 10 % de congés payés. Versés par vous aux extras, hors charges patronales. » (ne pas afficher de montant de charges)
   - séparateur trait
   - « Frais Koudmin » … **50 € HT** ; légende « 2 × 25 € HT. Extra absent et non remplacé : non facturé. »
   - Bouton piment « Trouver un extra »
   - Légende centrée avec icône file-text : « Contrat d'extra rédigé pour vous. »

États :
- **1b Envoi** : champs à opacity 0.5 et désactivés ; bouton piment-fonce avec spinner + « Envoi de la demande » (empêche le double envoi).
- **1c Erreur** : encadré en haut (fond blanc, bordure 2px braise, radius 12, icône alert-circle) « 2 champs à compléter. » ; champ fautif bordure 2px braise + message 13/18 600 braise sous le champ (ex. « Indiquez l'adresse du service. »).

### 2. Missions disponibles (extra)
Layout : hauteur écran fixe, header + liste scrollable + tab bar.
- Header : « Missions » (32/38) ; pilule localisation à droite « Saint-Paul · sans voiture » (13 600, contour galet).
- Filtres en pilules : Toutes (sélectionnée, basalte), Ce soir, Week-end.
- Légende : « 4 missions près de toi · retour assuré en premier ».
- **Tri** : si profil sans voiture → missions avec retour assuré d'abord, puis par distance croissante. Sinon par distance.
- **Carte mission** (ordre impératif) :
  1. Horaire (Bricolage 700 22/28) + à droite badge curcuma « Ce soir » (13/18 700, radius 6) ou jour en légende galet (« sam. 31 »).
  2. map-pin + commune (600) + « · 2,1 km » galet.
  3. Poste (16/24).
  4. Séparateur trait, puis « ≈ 63 € net » (16 600) et légende « 81,25 € brut, congés payés compris ».
  5. Restaurant (légende galet).
  6. Ligne retour (si profil sans voiture) : « Retour assuré par le restaurant » vacoa 13 600 + check, OU « Dernier bus 20 h 15 : retour à prévoir » galet + icône bus.
- Tab bar : Missions (actif, basalte 700), Dispos, Profil (galet) ; icônes 24px ; fond blanc, border-top trait.

Données de maquette : Le Boucan Grillé (Saint-Gilles-les-Bains, 2,1 km, Serveur, 18 h – minuit, ce soir, retour assuré) ; Ti Kaz Bar (Saint-Gilles, 2,3 km, Barman, 18 h – 1 h, sam. 31, retour assuré) ; Chez Tatie Lucette (Saint-Paul, 4,8 km, Plonge, 19 h – 23 h 30, ce soir, dernier bus 20 h 15) ; Hôtel Les Filaos (L'Hermitage, 6,0 km, Commis, 11 h 30 – 15 h, sam. 31, bus retour 15 h 20).

États :
- **Chargement** : 4 cartes squelette (blocs creme sur carte blanche, pulse opacity 1→0.45, 1.4s) + « Recherche des missions près de toi ».
- **Vide** : icône calendar dans carré blanc 56px ; « Pas de mission près de toi pour l'instant. » (22/28 600) ; « Coche tes soirées libres. On te prévient dès qu'un restaurant a besoin de toi. » ; bouton piment « Mettre à jour mes dispos ».
- **Hors ligne** : icône wifi-off braise ; « Pas de réseau. » (braise) ; « Les missions s'afficheront dès que la connexion revient. » ; bouton piment « Réessayer ».

### 3. Détail mission + « Mi lé la » (extra)
Layout : header (chevron retour 48×48 ; badge « Ce soir » à droite), contenu scrollable, barre d'action fixe en bas.
Contenu :
- « Vendredi 30 octobre » (galet) puis **pilule horaire** « 18 h – minuit » (fond blanc, bordure 1px basalte, Bricolage 700 32/38, padding 8×24).
- « Serveur en salle · Le Boucan Grillé » (22/28 600).
- Carte blanche, lignes séparées par trait (padding 16, gap 16, icône 20px) :
  - euro : « ≈ 63 € net » / « 81,25 € brut, congés payés compris. » / « 6 h × 12,31 € brut. Payé par le restaurant. »
  - map-pin : **avant confirmation** « Saint-Gilles-les-Bains · 2,1 km » / « Adresse exacte après confirmation. » — **après confirmation** « 14 rue du Général de Gaulle » / « 97434 Saint-Gilles-les-Bains » / « 2,1 km · entrée du personnel côté cuisine » + lien « Itinéraire » (piment-fonce, souligné, icône arrow-up-right → ouvrir l'app de cartes) + bouton secondaire « Appeler le restaurant » (icône phone, `tel:`).
  - check vacoa : « Retour assuré par le restaurant » / « Raccompagnement ou taxi payé après le service. » (sinon ligne bus en galet)
  - shirt : « Tenue noire. Chaussures fermées. »
- Ligne file-text : « Contrat d'extra à signer sur ton téléphone. Pas besoin de SIRET. » (masquée une fois confirmé).

Barre d'action (selon l'état) :
- **idle** : bouton « Mi lé la » piment, 64px.
- **sending** : bouton piment-fonce + spinner + « On prévient le restaurant ».
- **done** : bandeau vacoa (radius 12, padding 12×16, check) « C'est confirmé. On t'attend à 18 h. » puis bouton piment « Signer mon contrat » (icône pencil).
- **taken** : bouton grisé (fond creme, texte galet) + bottom sheet par-dessus un voile `rgba(33,28,24,.5)` : icône alert braise, « Mission déjà prise. », « Un autre extra a répondu avant toi. 3 missions t'attendent encore ce soir. », bouton piment « Voir les missions ».
- Toujours sous le bouton : « Un empêchement ? Préviens au moins 4 h avant. Une absence sans prévenir = exclusion. » (13/18 600 basalte, centré).
- En idle et done : lien galet souligné « Je ne peux plus venir » → écran désistement.

**3e Désistement** (plein écran) : chevron retour ; icône calendar-x dans carré blanc 56 ; « Tu ne viens plus ce soir ? » (32/38) ; pilule « 18 h – minuit · Le Boucan Grillé » ; « Le restaurant sera prévenu tout de suite. » ; barre d'action : bouton piment « Confirmer », lien piment-fonce « Annuler » (retour à l'état précédent).

Notification côté restaurateur à la confirmation : « Kévin a dit mi lé la. Arrivée prévue à 18 h. »

---

## Interactions & State
- Formulaire demande : `poste` (enum), `date`, `debut`, `fin` (durée calculée), `tauxHoraire` (≥ SMIC), `adresse` (requis), `retourAssure` (bool, **false par défaut**), `nbExtras` (≥1), `consignes`. Récapitulatif recalculé en direct. Validation au submit : résumé en haut + message sous chaque champ.
- Mission (extra) : `idle → sending → done` ; `sending → taken` si un autre extra a été plus rapide ; `idle|done → cancel → (Annuler) état précédent | (Confirmer) mission libérée, restaurant notifié`. Le désistement < 4 h avant ou l'absence non prévenue déclenche la règle d'exclusion (côté back-office).
- Spinner : rotation 0.9s linéaire infinie. Squelette : pulse opacity 1.4s ease-in-out.
- Hover bouton piment : `#9E3215`.
- Mobile : cibles tactiles ≥ 44px.

## Règles d'écriture
- Horaire, lieu, tarif d'abord. Une phrase, une information.
- Créole uniquement dans un mot : koudmin, péi, mi lé la.
- **Pas de point d'exclamation, pas d'émoji.**
- Formats : « 18 h – minuit », « 11 h 30 – 15 h », « 25 € HT », « ≈ 63 € net ».
- **Légal** : aucune offre publique ne mentionne d'âge (« jeunes », « 18-25 ans », « étudiants »…). Utiliser « dispo le soir », « en recherche de job ».

---

## Kit de marque (`Koudmin - Kit de marque.dc.html`, `Koudmin Logo.dc.html`)
- **Logo retenu : « Point pilule »** — « Koudmin » en Bricolage Grotesque 700, letter-spacing -0.045em (≥ 40px) / -0.03em (petit). Le point du « i » est remplacé par une pilule horizontale : 0.30em × 0.13em, radius 999, centrée sur le « ı » (i sans point), top ≈ 0.09em. À vectoriser en SVG pour la prod.
- Versions : basalte/creme pilule piment (principale) ; creme sur piment (pilule creme) ; creme sur basalte (pilule piment) ; **basalte/creme pilule basalte** — pour l'app, les e-mails, contrats et factures (le bouton d'action reste le seul élément piment).
- Règle : pilule piment = pubs, réseaux sociaux, imprimés ; pilule basalte = application, e-mails, documents.
- Zone de protection = hauteur du « o ». Taille min 110 px / 25 mm ; en dessous, monogramme.
- **Monogramme** : « K » creme sur piment, pilule creme au-dessus de la barre verticale. Icône app 1024×1024 fond plein sans coins. **Favicon 32×32** : « K » seul sans pilule.
- Réseaux sociaux (taille réelle, ids HTML pour export) : `#profil` 1080², `#couverture-facebook` 1640×624 (160 px du bas vides), `#banniere-linkedin` 1584×396, `#open-graph` 1200×630, `#post-mission` / `#post-chiffre` / `#post-temoignage` 1080×1350, `#story` 1080×1920 (250 px libres haut et bas). Le prop « Repères de recadrage » masque les guides.
- L'**icône d'app** et le **favicon** sont à générer depuis le monogramme pour le projet.

## Assets
Aucune image bitmap. Polices Google Fonts (Bricolage Grotesque, Figtree). Icônes Lucide. Pas de photos (direction photo à venir).

## Files
- `CHARTE.md` — charte graphique complète (couleurs, typo, formes, logo, écriture, salaires).
- `PROMPT_CLAUDE_CODE.md` — prompt de démarrage pour Claude Code.
- `captures/` — PNG de chaque écran et état (1a–3e), des planches d'identité et des visuels réseaux sociaux à taille réelle.
- `Koudmin - Ecrans prioritaires.dc.html` — écrans 1, 2, 3 et tous leurs états (3a interactif).
- `Koudmin - Kit de marque.dc.html` — identité + réseaux sociaux.
- `Koudmin Logo.dc.html` — composant logo (props `size`, `ink`, `dot`).
- `support.js` — runtime nécessaire pour ouvrir les `.dc.html` dans un navigateur.
