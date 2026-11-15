# Sortie de l'app Kivien (extras) sur l'App Store et Google Play

L'app est prête côté code : version 1.0.0, identifiant `re.kivien.extra`, notifications sur le
téléphone (alertes de missions, contrat à signer, rappel de la veille) envoyées par le VPS.
Il reste les comptes et les envois, qui se font depuis ton ordinateur, avec ton identité.

Sortie **discrète** conseillée : publication manuelle côté Apple, test fermé côté Google, et
aucune annonce tant que le vivier d'extras n'est pas prêt.

---

## 1. Les comptes (une seule fois)

| Compte | Prix | Où |
|---|---|---|
| Apple Developer Program | 99 USD par an | developer.apple.com/programs/enroll |
| Google Play Console | 25 USD, une fois | play.google.com/console/signup |
| Expo (outil de compilation EAS) | gratuit pour démarrer | expo.dev/signup |
| Firebase (notifications Android) | gratuit | console.firebase.google.com |

**Personne ou entreprise ?** En EI, Apple et Google t'inscrivent en général comme **particulier** :
c'est ton nom (Emmanuel TAOCHY) qui s'affiche comme vendeur. Pour afficher « Kivien » ou une
société, il faut un compte **organisation**, qui demande un numéro D-U-N-S (gratuit, quelques
jours à obtenir) et une structure juridique reconnue.

**Google, compte particulier récent :** Google demande un **test fermé avec au moins 12 testeurs
pendant 14 jours** avant de pouvoir publier en production. C'est l'occasion de faire tester l'app
par tes premiers extras. Vérifie la règle en vigueur dans la Play Console au moment de t'inscrire.

---

## 2. Relier l'app à Expo (sur ton ordinateur)

```bash
npm install -g eas-cli
```

```bash
cd apps/extra && eas login
```

```bash
eas init
```

`eas init` ajoute `extra.eas.projectId` dans `apps/extra/app.json`. Ce numéro n'est pas secret :
envoie-le-moi ou pousse le fichier, je l'intègre. **Sans lui, les notifications ne marchent pas.**

---

## 3. Notifications Android (Firebase)

1. Console Firebase → **Ajouter un projet** « Kivien » (sans Google Analytics).
2. **Ajouter une app Android**, nom du package : `re.kivien.extra`.
3. Télécharge `google-services.json` et envoie-le-moi (ou place-le dans `apps/extra/`) : je
   l'ajoute à la configuration (`android.googleServicesFile`).
4. Firebase → Paramètres du projet → **Comptes de service** → **Générer une nouvelle clé privée**.
   Ce fichier-là est **secret** : ne l'envoie à personne. Donne-le directement à Expo :

```bash
eas credentials -p android
```

Choisis *production* → *Google Service Account* → *Push Notifications (FCM V1)* → envoie le fichier.

Côté iPhone, rien à faire : à la première compilation iOS, EAS propose de créer la clé de
notifications Apple. Réponds **oui**.

---

## 4. Compiler et envoyer

```bash
eas build -p ios --profile production
```

```bash
eas build -p android --profile production
```

- **iPhone :** crée d'abord l'app dans App Store Connect (Mes apps → +), identifiant de lot
  `re.kivien.extra`, puis reporte son numéro (Apple ID de l'app) dans `apps/extra/eas.json`
  à la place de `A_RENSEIGNER`. Ensuite :

```bash
eas submit -p ios --latest
```

- **Android :** crée l'app dans la Play Console. Le **premier** fichier `.aab` se dépose à la
  main dans un test fermé (le lien de téléchargement est donné par `eas build`). Les suivants :

```bash
eas submit -p android --latest
```

---

## 5. Fiche de l'app (textes prêts à copier)

**Nom (30 caractères max) :** Kivien : missions d'extra

**Sous-titre Apple (30 max) :** Extras péi à La Réunion

**Description courte Google (80 max) :**
Missions d'extra près de chez toi à La Réunion. Un vrai contrat à chaque mission.

**Description :**

> Kivien, c'est l'app des extras à La Réunion.
>
> Restaurants, hôtels, bars, traiteurs, événements : les établissements de l'île publient leurs
> besoins, et tu reçois les missions près de chez toi.
>
> Comment ça marche
> - Tu indiques tes créneaux libres, midi ou soir.
> - Tu reçois les missions proches de chez toi : poste, horaires, taux horaire et distance.
> - Tu dis « mi lé la » et la mission est à toi.
> - Tu signes ton contrat d'extra sur ton téléphone, en une minute.
>
> Un vrai contrat à chaque mission
> L'établissement t'embauche en contrat d'extra (CDD d'usage) et te paie avec un bulletin de
> paie, congés payés compris. Pas besoin de SIRET. Kivien est gratuit pour les extras.
>
> Tout au même endroit
> - L'adresse et l'itinéraire de chaque mission confirmée
> - Tes contrats en PDF
> - Tes gains du mois et de l'année
> - Le pointage de ton arrivée et de ton départ
>
> Salle, cuisine, plonge, bar, réception, animation, événements, déménagement : choisis tes
> métiers et tes soirées.

**Mots-clés Apple (100 max) :** extra,mission,restaurant,hôtel,salle,plonge,cuisine,bar,job,Réunion,974,soirée,emploi

**Catégorie :** Économie et entreprise (Apple) · Entreprise (Google)

**URL de confidentialité :** https://kivien.re/confidentialite

**URL d'assistance :** https://kivien.re/questions-frequentes

**E-mail de contact :** bonjour@kivien.re

**Classification par âge :** questionnaire sans contenu sensible (pas de violence, de jeux
d'argent ni de contenu pour adultes).

**Captures d'écran :** dossier `captures/` à côté de ce fichier, faites avec des données fictives.
- iPhone 6,7 pouces (1290 × 2796) : `iphone-1-missions.png` à `iphone-5-profil.png`
- Android (1080 × 1920) : `android-1-missions.png` à `android-5-profil.png`

---

## 6. Données collectées (« Confidentialité de l'app » chez Apple, « Sécurité des données » chez Google)

| Donnée | Pourquoi | Liée à la personne | Pistage publicitaire |
|---|---|---|---|
| Nom, prénom | Contrat, profil | Oui | Non |
| Téléphone | Connexion, contact avec l'établissement | Oui | Non |
| Adresse e-mail | Alertes, mot de passe oublié | Oui | Non |
| Adresse postale, date et lieu de naissance, numéro de sécurité sociale | Contrat et déclaration d'embauche (DPAE) | Oui | Non |
| Commune (pas de position GPS) | Missions proches | Oui | Non |
| Photo de profil | Profil vu par l'établissement de la mission | Oui | Non |
| Jeton de notification de l'appareil | Notifications sur le téléphone | Oui | Non |

Aucune publicité, aucun traceur publicitaire, aucune revente de données. Données chiffrées en
transit (HTTPS). Suppression du compte sur demande à bonjour@kivien.re.

---

## 7. Compte de test pour la validation Apple et Google

Les équipes de validation doivent pouvoir se connecter. Crée un compte extra de test dans l'app
(un mobile à toi, un mot de passe dédié) et donne-le dans « Informations pour la validation ».
Précise : « App réservée à La Réunion : les missions apparaissent quand des établissements en
publient. »

---

## 8. Sortie discrète

- **Apple :** dans la version, choisis **« Publier manuellement cette version »**. Une fois
  validée, l'app attend ton feu vert.
- **Google :** reste en **test fermé** (liste d'adresses e-mail de testeurs) tant que tu ne
  veux pas de public.

Une mise à jour du code sans nouvelle compilation (textes, écrans) arrive aussi sur
app.kivien.re à chaque mise en ligne. L'app des stores, elle, a besoin d'une nouvelle compilation
(`eas build`, puis `eas submit`).
