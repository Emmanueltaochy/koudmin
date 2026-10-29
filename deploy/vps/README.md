# Base de données Kivien sur le VPS

Supabase auto-hébergé (Postgres, authentification par téléphone et mot de passe, API, temps réel) sur le VPS Hostinger,
servi sur `https://api.kivien.re`. Le site et l'app s'y connectent avec l'URL et la clé publique.

## Ce que fait `installer.sh`

1. Vérifie le système (Ubuntu, 3 Go de mémoire et 15 Go de disque libres, nginx présent) et
   s'arrête si un conteneur `supabase-*` d'un autre projet existe ou si `api.kivien.re` est déjà configuré dans nginx.
2. Installe Docker depuis le dépôt officiel **seulement s'il est absent** (jamais de mise à jour).
3. Récupère ce dépôt dans `/opt/kivien/source`.
4. Copie la configuration Supabase officielle (versionnée dans `supabase/`, relue) dans `/opt/kivien/supabase`,
   génère les secrets **une seule fois** dans `.env` (droits 600, jamais affichés), désactive l'inscription
   par e-mail et anonyme, active l'inscription par téléphone.
5. Démarre les conteneurs (projet compose `kivien`).
6. Applique `supabase/migrations/*.sql` dans l'ordre, une seule fois chacune, et pose les paramètres
   tarifaires initiaux (SMIC 12,31 €, frais 25 € HT, TVA 8,5 %) si la table est vide. Les données fictives
   (`seed.sql`) ne sont **jamais** chargées en production.
7. Ajoute un seul fichier nginx pour `api.kivien.re` (testé par `nginx -t`, retiré en cas d'échec),
   puis le certificat HTTPS Let's Encrypt si le DNS pointe déjà sur le VPS.
8. Sauvegarde quotidienne à 3 h 17 heure de La Réunion (minuteur systemd) dans `/var/backups/kivien`, 14 jours conservés.
9. Lance `verifier.sh` et affiche l'URL et la clé publique (`ANON_KEY`), rien d'autre.

Sécurité :

- aucun port public n'est ouvert : la passerelle écoute sur `127.0.0.1`, le pooler Postgres n'est pas publié ;
- nginx ne relaie que `/auth/v1/`, `/rest/v1/` et `/realtime/v1/`. Le reste (Studio, fonctions, stockage)
  répond 404 depuis Internet ;
- les autres services du VPS ne sont pas touchés.

Le script est relançable : il conserve `.env` et les données, et n'applique que les nouvelles migrations.

## Lancer l'installation

Dans hPanel : VPS, puis Terminal du navigateur (connecté en root).

```bash
curl -fsSL https://raw.githubusercontent.com/Emmanueltaochy/koudmin/main/deploy/vps/installer.sh -o installer.sh
```

```bash
KIVIEN_EMAIL=ton-adresse@exemple.re bash installer.sh
```

`KIVIEN_EMAIL` reçoit les alertes d'expiration du certificat HTTPS. Compter 5 à 15 minutes au premier lancement
(téléchargement des images). Le journal complet est dans `/var/log/kivien-installation.log`.

## Après l'installation

Variables à donner aux applications (valeurs affichées à la fin de l'installation) :

| Application | Variables |
| --- | --- |
| Site restaurateur (`apps/resto`) | `NEXT_PUBLIC_SUPABASE_URL=https://api.kivien.re`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=…` |
| App extra (`apps/extra`) | `EXPO_PUBLIC_SUPABASE_URL=https://api.kivien.re`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=…` |

La clé `ANON_KEY` est publique par nature (protégée par les règles RLS). `SERVICE_ROLE_KEY` et les mots de
passe restent dans `/opt/kivien/supabase/.env` et ne doivent jamais quitter le VPS.

### Connexion

Pour l'instant, connexion par mobile et mot de passe (8 caractères minimum), sans SMS : le compte est actif
dès l'inscription. Conséquence à connaître : le numéro n'est pas vérifié, n'importe qui peut s'inscrire avec
n'importe quel numéro. Les restaurants ne sont rattachés à un compte que par `ajouter-restaurant.sh`, qui
refuse un numéro déjà inscrit.

Mot de passe oublié (extra ou restaurateur), en attendant la réinitialisation par SMS :

```bash
sudo /opt/kivien/source/deploy/vps/reinitialiser-mot-de-passe.sh "+262692123456"
```

Un nouveau mot de passe s'affiche une fois, les appareils connectés sont déconnectés.

Contre les essais de mots de passe en série, nginx limite par adresse IP la connexion (30 par minute)
et l'inscription (10 par minute).

### SMS de vérification (plus tard)

Une fois le compte Twilio créé, ajouter dans
`/opt/kivien/supabase/.env` :

```
SMS_PROVIDER=twilio
SMS_TWILIO_ACCOUNT_SID=…
SMS_TWILIO_AUTH_TOKEN=…
SMS_TWILIO_MESSAGE_SERVICE_SID=…
```

puis relancer `bash installer.sh` avec la même commande : la configuration SMS est ajoutée automatiquement
et les nouveaux comptes devront confirmer leur numéro (écran de code à rebrancher dans les apps).

### Comptes restaurateurs

En attendant l'écran d'inscription restaurateur :

```bash
sudo /opt/kivien/source/deploy/vps/ajouter-restaurant.sh "+262692123456" "Le Boucan Grillé" "14 rue du Général de Gaulle, Saint-Gilles-les-Bains"
```

L'adresse est géolocalisée (Géoplateforme IGN, codes postaux 974 uniquement). Le mot de passe du restaurateur
s'affiche une seule fois : le lui transmettre directement.

### Studio (administration)

Studio n'est pas exposé sur Internet. Depuis ton ordinateur :

```bash
ssh -L 18000:127.0.0.1:18000 root@187.124.33.84
```

puis ouvrir `http://localhost:18000` (identifiant `kivien`, mot de passe : `DASHBOARD_PASSWORD` dans le `.env` du VPS).
Le port réel est `KIVIEN_PORT_API` dans le `.env` (18000 sauf s'il était déjà pris).

## Site kivien.re et app web (app.kivien.re)

Le même VPS sert aussi :

- **kivien.re** (et www) : page d'accueil et espace restaurateur (Next.js), conteneur `kivien-site`
  sur 127.0.0.1 (port `KIVIEN_PORT_SITE`, 18100 par défaut), image construite sur le VPS
  (`deploy/vps/site/Dockerfile`) ;
- **app.kivien.re** : l'app extra en version web, fichiers statiques dans `/opt/kivien/web/app`.

`deployer-site.sh` construit les deux, démarre la nouvelle version du site à côté de l'ancienne et ne
bascule que si elle répond : en cas d'échec, l'ancienne reste en ligne. `publier-site.sh` écrit le
fichier nginx `kivien-site.conf` (refuse si un autre fichier nginx sert déjà ces noms) et demande
les certificats HTTPS dès que les noms pointent vers le VPS : relancé à chaque mise à jour.

DNS attendus (zone kivien.re) : `@` et `app` en A vers l'IP du VPS, `www` vers `kivien.re`.

## Déploiement automatique (push sur main)

À chaque push, GitHub Actions vérifie tout : types, tests unitaires, migrations et règles d'accès sur
un Postgres jetable, scripts du serveur, builds, parcours de bout en bout des deux applications.
Sur `main`, si tout est vert, GitHub se connecte au VPS et lance la mise à jour :

- seulement la dernière version de `main` (une version plus ancienne est ignorée) ;
- sauvegarde de la base avant toute nouvelle migration ;
- migrations appliquées une seule fois ; installeur complet si la configuration du serveur a changé ;
- vérification finale : le déploiement apparaît en rouge dans GitHub si un point échoue.

Mise en place, une seule fois, dans le terminal du VPS :

```bash
sudo /opt/kivien/source/deploy/vps/autoriser-github.sh
```

Le script crée une clé SSH réservée à GitHub, qui ne peut lancer que la mise à jour, et affiche les
3 secrets à créer dans GitHub (dépôt, Settings, Secrets and variables, Actions) : `VPS_HOTE`, `VPS_PORT`,
`VPS_CLE_SSH`. La clé privée n'est gardée que par GitHub.

L'identité du VPS (sa clé publique SSH, non secrète) est versionnée dans `deploy/vps/cle-hote-vps.pub` :
GitHub refuse de se connecter à un serveur qui présenterait une autre clé. Si le VPS est réinstallé,
remplacer ce fichier par la sortie de `cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub`.

Si un pare-feu Hostinger filtre le port SSH, il doit accepter les connexions de GitHub Actions.

Journal des mises à jour sur le VPS : `/var/log/kivien-mises-a-jour.log`. Mise à jour à la main :
`sudo kivien-mise-a-jour deployer <sha complet du dernier commit de main>`.

## Exploitation

| Besoin | Commande (en root) |
| --- | --- |
| Vérifier l'état | `/opt/kivien/source/deploy/vps/verifier.sh` |
| Appliquer de nouvelles migrations | `cd /opt/kivien/source && git pull && deploy/vps/appliquer-migrations.sh supabase/migrations` |
| Sauvegarder maintenant | `kivien-sauvegarde` |
| Historique des sauvegardes | `journalctl -u kivien-sauvegarde --since -7d` |
| Journaux d'un service | `cd /opt/kivien/supabase && docker compose logs --tail 100 auth` |
| Redémarrer | `cd /opt/kivien/supabase && docker compose restart` |

Restaurer une sauvegarde (après arrêt des services qui écrivent) :

```bash
docker exec -i supabase-db pg_restore -h localhost -U postgres -d postgres --clean --if-exists --no-owner < /var/backups/kivien/kivien-AAAAMMJJ-HHMM.dump
```

Une migration déjà appliquée ne se modifie jamais : on écrit une nouvelle migration.

## Reste à faire avant l'ouverture

- Copie des sauvegardes hors du VPS, chiffrée (aujourd'hui elles sont sur le même disque).
- Fournisseur SMS pour vérifier les numéros (voir plus haut).
- Mises à jour de Supabase : la configuration est figée sur la version relue ; une mise à jour se fait
  en remplaçant `supabase/` dans le dépôt, après relecture et sauvegarde.
- Mise à jour de la configuration : les fichiers `supabase/` viennent de
  [supabase/supabase](https://github.com/supabase/supabase/tree/master/docker) (Apache 2.0, voir `supabase/LICENSE`).
