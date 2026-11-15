# Sortie de l'app Kivien (extras) sur l'App Store et Google Play

L'app est prête côté code : version 1.0.0, identifiant `re.kivien.extra`, notifications sur le
téléphone (alertes de missions, contrat à signer, rappel de la veille) envoyées par le VPS.
Compilation et envoi par **Codemagic** (`codemagic.yaml` à la racine du dépôt).

Sortie **discrète** conseillée : publication manuelle côté Apple, test fermé côté Google, et
aucune annonce tant que le vivier d'extras n'est pas prêt.

---

## 1. Ce qu'il faut (tu as déjà les comptes Apple et Google, et Codemagic)

| Où | Quoi |
|---|---|
| App Store Connect | Créer l'app : Mes apps → + → identifiant de lot `re.kivien.extra` (à créer dans Certificats, identifiants et profils, avec la capacité **Push Notifications** cochée). Noter son **Apple ID** (un nombre). |
| Google Play Console | Créer l'app « Kivien ». Le **premier** fichier `.aab` se dépose à la main (test interne) ; Codemagic envoie les suivants. |
| expo.dev (gratuit) | Créer un projet « kivien-extra » : son **ID de projet** sert aux notifications sur le téléphone. Aucune compilation ne passe par Expo. |
| Firebase (gratuit) | Projet « Kivien » → app Android `re.kivien.extra` → télécharger `google-services.json`. |

---

## 2. Notifications sur le téléphone (une seule fois)

Les notifications partent du VPS par le service gratuit d'Expo, qui les remet à Apple et Google.
Expo a besoin des deux clés suivantes, à déposer sur **expo.dev → projet kivien-extra →
Credentials** (jamais dans le dépôt, jamais par message) :

- **iPhone :** une clé APNs (.p8). Apple Developer → Keys → + → coche *Apple Push Notifications
  service (APNs)* → télécharge le fichier, note le Key ID et ton Team ID.
- **Android :** Firebase → Paramètres du projet → Comptes de service → *Générer une nouvelle clé
  privée* → dépose le fichier dans *FCM V1 service account key*.

---

## 3. Réglages Codemagic (une seule fois)

Le dépôt contient `codemagic.yaml`, avec deux compilations lancées à la main : **Kivien · iPhone**
et **Kivien · Android**.

1. Ajoute le dépôt Emmanueltaochy/koudmin dans Codemagic (il lira `codemagic.yaml`).
2. **Team settings → Integrations → Developer Portal** : ta clé API App Store Connect. Si elle ne
   s'appelle pas « Kivien App Store Connect », remplace ce nom dans `codemagic.yaml` (ligne
   `app_store_connect:`) ou dis-moi son nom.
3. **Code signing identities → Android keystores** : ta clé de signature Android (ou une nouvelle),
   avec la référence `kivien_keystore`. Garde une copie de cette clé : sans elle, impossible de
   mettre l'app à jour sur Google Play.
4. **Environment variables**, groupe `kivien` :

| Variable | Valeur | Secret |
|---|---|---|
| `EXPO_PROJECT_ID` | l'ID du projet expo.dev | non |
| `APP_STORE_APPLE_ID` | l'Apple ID de l'app (un nombre) | non |
| `GOOGLE_SERVICES_JSON` | `google-services.json` encodé en base64 (`base64 -i google-services.json`) | oui |
| `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | le compte de service Google Play (le même que pour ton autre app convient s'il a accès à la nouvelle) | oui |

---

## 4. Compiler et envoyer

Dans Codemagic : **Start new build** → branche `main` → workflow **Kivien · iPhone** ou
**Kivien · Android**.

- **iPhone :** l'app part sur **TestFlight**. La mise en vente reste manuelle dans App Store Connect.
- **Android :** l'app part en **test interne**, en brouillon. La publication reste manuelle dans
  la Play Console.

Le numéro de build se calcule tout seul (le dernier envoyé + 1).

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

Une mise à jour du code arrive sur app.kivien.re à chaque mise en ligne. L'app des stores, elle, a
besoin d'une nouvelle compilation dans Codemagic, puis d'une nouvelle version dans chaque store.
