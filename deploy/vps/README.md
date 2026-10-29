# Base de données Kivien sur le VPS

Supabase auto-hébergé (Postgres, authentification par SMS, API, temps réel) sur le VPS Hostinger,
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
curl -fsSL https://raw.githubusercontent.com/Emmanueltaochy/koudmin/claude/adoring-mendel-u8wzbb/deploy/vps/installer.sh -o installer.sh
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

### SMS de connexion

Sans fournisseur SMS, personne ne peut se connecter. Une fois le compte Twilio créé, ajouter dans
`/opt/kivien/supabase/.env` :

```
SMS_PROVIDER=twilio
SMS_TWILIO_ACCOUNT_SID=…
SMS_TWILIO_AUTH_TOKEN=…
SMS_TWILIO_MESSAGE_SERVICE_SID=…
```

puis relancer `bash installer.sh` avec la même commande : la configuration SMS est ajoutée automatiquement.

### Comptes restaurateurs

En attendant l'écran d'inscription restaurateur :

```bash
sudo /opt/kivien/source/deploy/vps/ajouter-restaurant.sh "+262692123456" "Le Boucan Grillé" "14 rue du Général de Gaulle, Saint-Gilles-les-Bains"
```

L'adresse est géolocalisée (Géoplateforme IGN, codes postaux 974 uniquement).

### Studio (administration)

Studio n'est pas exposé sur Internet. Depuis ton ordinateur :

```bash
ssh -L 18000:127.0.0.1:18000 root@187.124.33.84
```

puis ouvrir `http://localhost:18000` (identifiant `kivien`, mot de passe : `DASHBOARD_PASSWORD` dans le `.env` du VPS).
Le port réel est `KIVIEN_PORT_API` dans le `.env` (18000 sauf s'il était déjà pris).

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
- Fournisseur SMS (voir plus haut).
- Mises à jour de Supabase : la configuration est figée sur la version relue ; une mise à jour se fait
  en remplaçant `supabase/` dans le dépôt, après relecture et sauvegarde.
- Mise à jour de la configuration : les fichiers `supabase/` viennent de
  [supabase/supabase](https://github.com/supabase/supabase/tree/master/docker) (Apache 2.0, voir `supabase/LICENSE`).
