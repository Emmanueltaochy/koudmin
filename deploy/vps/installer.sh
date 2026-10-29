#!/usr/bin/env bash
# Installe la base Kivien (Supabase auto-hébergé) sur le VPS, derrière https://api.kivien.re.
#
# Prudent avec les services déjà présents :
#   - n'installe Docker que s'il est absent ; ne le met jamais à jour ;
#   - aucun port public ouvert : la passerelle écoute sur 127.0.0.1, nginx (existant) relaie ;
#   - n'ajoute qu'un fichier nginx (api.kivien.re), testé par « nginx -t » avant rechargement ;
#   - s'arrête au moindre conflit (conteneur supabase-* étranger, domaine déjà configuré…).
# Relançable : les secrets générés à la première installation ne sont jamais régénérés.
#
# Usage (en root) :
#   KIVIEN_EMAIL=toi@exemple.re bash installer.sh
#
# Variables optionnelles : KIVIEN_DOMAINE_API (api.kivien.re), KIVIEN_SITE (https://kivien.re),
#   KIVIEN_REF (branche ou commit du dépôt), KIVIEN_DEPOT (URL git du dépôt).
set -euo pipefail

DOMAINE=${KIVIEN_DOMAINE_API:-api.kivien.re}
SITE=${KIVIEN_SITE:-https://kivien.re}
DEPOT=${KIVIEN_DEPOT:-https://github.com/Emmanueltaochy/koudmin.git}
REF=${KIVIEN_REF:-claude/adoring-mendel-u8wzbb}
EMAIL=${KIVIEN_EMAIL:-}
RACINE=/opt/kivien
SOURCE=$RACINE/source
ICI=$RACINE/supabase
JOURNAL=/var/log/kivien-installation.log
COMPOSE_MIN=2.24.4

etape() { printf '\n== %s\n' "$*" | tee -a "$JOURNAL"; }
info() { printf '   %s\n' "$*" | tee -a "$JOURNAL"; }
arret() { printf '\nARRÊT : %s\n' "$*" | tee -a "$JOURNAL" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || arret "à lancer en root (sudo)."
mkdir -p "$RACINE"
touch "$JOURNAL" && chmod 600 "$JOURNAL"
echo "--- $(date -u +%FT%TZ) installation Kivien" >> "$JOURNAL"

# ---------------------------------------------------------------------------
etape "1/9 Vérifications"
. /etc/os-release
[ "${ID:-}" = ubuntu ] || arret "Ubuntu attendu (trouvé : ${ID:-inconnu})."
[ -n "$EMAIL" ] || arret "KIVIEN_EMAIL manquant (adresse pour le certificat HTTPS Let's Encrypt)."
dispo_go=$(( $(awk '/MemAvailable/ {print $2}' /proc/meminfo) / 1024 / 1024 ))
disque_go=$(( $(df -Pk / | awk 'NR==2 {print $4}') / 1024 / 1024 ))
info "mémoire disponible : ${dispo_go} Go, disque libre : ${disque_go} Go"
[ "$dispo_go" -ge 3 ] || arret "moins de 3 Go de mémoire disponible."
[ "$disque_go" -ge 15 ] || arret "moins de 15 Go libres sur le disque."
command -v nginx >/dev/null || arret "nginx absent : ce script s'appuie sur le nginx déjà en place."
for cmd in git curl openssl python3 ss; do command -v "$cmd" >/dev/null || apt-get install -y -q "$cmd" >> "$JOURNAL" 2>&1; done

# Conflits : un autre Supabase sur la machine (noms de conteneurs fixes), ou le domaine déjà servi.
if command -v docker >/dev/null; then
  for c in $(docker ps -a --format '{{.Names}}' | grep -E '^(supabase-|realtime-dev\.supabase)' || true); do
    projet=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$c")
    [ "$projet" = kivien ] || arret "le conteneur $c existe déjà (projet « $projet »). Un autre Supabase tourne sur ce VPS."
  done
fi
if grep -rlsE "server_name[^;]*\b${DOMAINE//./\\.}\b" /etc/nginx | grep -vq "kivien-api"; then
  arret "$DOMAINE est déjà configuré dans nginx : $(grep -rlsE "server_name[^;]*${DOMAINE//./\\.}" /etc/nginx | grep -v kivien-api | head -1)"
fi

# ---------------------------------------------------------------------------
etape "2/9 Docker"
if ! command -v docker >/dev/null; then
  info "Docker absent : installation depuis le dépôt officiel Docker."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q >> "$JOURNAL" 2>&1
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >> "$JOURNAL" 2>&1
  systemctl enable --now docker >> "$JOURNAL" 2>&1
else
  info "Docker déjà présent : $(docker --version) (laissé tel quel)."
fi
version=$(docker compose version --short 2>/dev/null | sed 's/^v//') || arret "le plugin « docker compose » est absent. L'installer (docker-compose-plugin) puis relancer."
if [ "$(printf '%s\n%s\n' "$COMPOSE_MIN" "$version" | sort -V | head -1)" != "$COMPOSE_MIN" ]; then
  arret "docker compose $version trop ancien (minimum $COMPOSE_MIN). Mettre à jour le plugin compose, puis relancer."
fi
info "docker compose $version"

# ---------------------------------------------------------------------------
etape "3/9 Code Kivien ($REF)"
if [ -d "$SOURCE/.git" ]; then
  git -C "$SOURCE" fetch -q --depth 1 origin "$REF"
  git -C "$SOURCE" checkout -q --force FETCH_HEAD
else
  git clone -q --depth 1 --branch "$REF" "$DEPOT" "$SOURCE"
fi
info "commit $(git -C "$SOURCE" rev-parse --short HEAD)"

# ---------------------------------------------------------------------------
etape "4/9 Configuration Supabase"
mkdir -p "$ICI"
# Fichiers de la configuration officielle relue (versionnée dans le dépôt). .env et données conservés.
cp -r "$SOURCE/deploy/vps/supabase/." "$ICI/"
mkdir -p "$ICI/volumes/snippets" "$ICI/volumes/storage"

lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
regler() {
  local cle=$1 valeur=$2
  if grep -qE "^$cle=" "$ICI/.env"; then
    python3 - "$ICI/.env" "$cle" "$valeur" <<'PY'
import sys
chemin, cle, valeur = sys.argv[1:]
lignes = open(chemin).read().splitlines()
lignes = [f"{cle}={valeur}" if l.startswith(cle + "=") else l for l in lignes]
open(chemin, "w").write("\n".join(lignes) + "\n")
PY
  else
    printf '%s=%s\n' "$cle" "$valeur" >> "$ICI/.env"
  fi
}

if [ ! -f "$ICI/.env" ]; then
  info "première installation : génération des secrets (rien n'est affiché)."
  umask 077
  cp "$ICI/.env.example" "$ICI/.env"
  (cd "$ICI" && sh utils/generate-keys.sh --update-env > /dev/null)
  rm -f "$ICI/.env.old"
  regler DASHBOARD_USERNAME kivien
  regler POOLER_TENANT_ID kivien
else
  info ".env existant conservé (secrets inchangés)."
fi
chmod 600 "$ICI/.env"

# Port local libre pour la passerelle (choisi une fois, puis conservé).
port=$(lire KIVIEN_PORT_API || true)
if [ -z "$port" ]; then
  port=18000
  while ss -ltnH "sport = :$port" | grep -q .; do port=$((port + 1)); done
fi
fichiers=docker-compose.yml:docker-compose.kivien.yml
[ -n "$(lire SMS_PROVIDER || true)" ] && fichiers=$fichiers:docker-compose.kivien-sms.yml

regler COMPOSE_FILE "$fichiers"
regler COMPOSE_PROJECT_NAME kivien
regler KIVIEN_PORT_API "$port"
regler KIVIEN_DOMAINE_API "$DOMAINE"
regler SUPABASE_PUBLIC_URL "https://$DOMAINE"
regler API_EXTERNAL_URL "https://$DOMAINE/auth/v1"
regler SITE_URL "$SITE"
regler ADDITIONAL_REDIRECT_URLS ""
regler ENABLE_EMAIL_SIGNUP false
regler ENABLE_ANONYMOUS_USERS false
regler ENABLE_PHONE_SIGNUP true
regler ENABLE_PHONE_AUTOCONFIRM false
regler OPENAI_API_KEY ""
regler STUDIO_DEFAULT_ORGANIZATION Kivien
regler STUDIO_DEFAULT_PROJECT Kivien
regler PROXY_DOMAIN "$DOMAINE"
regler CERTBOT_EMAIL "$EMAIL"
regler FUNCTIONS_VERIFY_JWT true

# Aucune valeur d'exemple ne doit subsister.
if grep -qE '^[A-Z_]+=(your-|this_password_is_insecure|secret1234|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyAgCiAg)' "$ICI/.env"; then
  arret "des valeurs d'exemple restent dans $ICI/.env : $(grep -oE '^[A-Z_]+=(your-|this_password|secret1234|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyAgCiAg)' "$ICI/.env" | cut -d= -f1 | tr '\n' ' ')"
fi
info "passerelle locale : 127.0.0.1:$port ; fichiers compose : $fichiers"

(cd "$ICI" && docker compose config -q) || arret "configuration docker compose invalide (voir ci-dessus)."

# ---------------------------------------------------------------------------
etape "5/9 Démarrage (téléchargement des images au premier lancement : plusieurs minutes)"
cd "$ICI"
docker compose pull -q >> "$JOURNAL" 2>&1
if ! docker compose up -d --wait --wait-timeout 600 >> "$JOURNAL" 2>&1; then
  docker compose ps
  for s in db auth rest realtime api-gw studio; do
    echo "--- $s"; docker compose logs --tail 15 "$s" 2>&1 | grep -viE 'password|secret|token|key' || true
  done
  arret "un service n'a pas démarré (journaux ci-dessus, détail dans $JOURNAL)."
fi
docker compose ps --format '   {{.Name}} : {{.Status}}'

# ---------------------------------------------------------------------------
etape "6/9 Migrations Kivien"
bash "$SOURCE/deploy/vps/appliquer-migrations.sh" "$SOURCE/supabase/migrations" | tee -a "$JOURNAL"

# ---------------------------------------------------------------------------
etape "7/9 nginx et HTTPS ($DOMAINE)"
if [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
  conf=/etc/nginx/sites-available/kivien-api.conf
  lien=/etc/nginx/sites-enabled/kivien-api.conf
else
  conf=/etc/nginx/conf.d/kivien-api.conf
  lien=
fi
if [ ! -f "$conf" ] || ! grep -q "ssl_certificate" "$conf"; then
  sed -e "s/__DOMAINE__/$DOMAINE/g" -e "s/__PORT__/$port/g" "$SOURCE/deploy/vps/nginx-api.conf.modele" > "$conf"
else
  # Certificat déjà posé par certbot : on ne met à jour que le port.
  sed -i -E "s#proxy_pass http://127\.0\.0\.1:[0-9]+;#proxy_pass http://127.0.0.1:$port;#" "$conf"
fi
[ -n "$lien" ] && ln -sf "$conf" "$lien"
if ! nginx -t >> "$JOURNAL" 2>&1; then
  rm -f "$conf" ${lien:+"$lien"}
  nginx -t 2>&1 | tail -5
  arret "nginx -t a échoué : fichier Kivien retiré, nginx laissé tel quel."
fi
systemctl reload nginx

ip_dns=$(getent ahostsv4 "$DOMAINE" | awk 'NR==1 {print $1}')
if [ -z "$ip_dns" ] || ! hostname -I | tr ' ' '\n' | grep -qx "$ip_dns"; then
  info "ATTENTION : $DOMAINE ne pointe pas encore vers ce VPS (résolu : ${ip_dns:-rien}). HTTPS à relancer plus tard :"
  info "  certbot --nginx -d $DOMAINE -m $EMAIL --agree-tos --redirect --non-interactive"
else
  command -v certbot >/dev/null || apt-get install -y -q certbot python3-certbot-nginx >> "$JOURNAL" 2>&1
  certbot --nginx -d "$DOMAINE" -m "$EMAIL" --agree-tos --redirect --non-interactive --keep-until-expiring >> "$JOURNAL" 2>&1 \
    || arret "certbot a échoué (détail dans $JOURNAL). nginx sert $DOMAINE en HTTP en attendant."
  nginx -t >> "$JOURNAL" 2>&1 && systemctl reload nginx
  info "certificat HTTPS en place."
fi

# ---------------------------------------------------------------------------
etape "8/9 Sauvegarde quotidienne"
install -m 0700 "$SOURCE/deploy/vps/sauvegarde.sh" /usr/local/sbin/kivien-sauvegarde
# Minuteur systemd à l'heure de La Réunion, quel que soit le fuseau du VPS.
cat > /etc/systemd/system/kivien-sauvegarde.service <<'UNIT'
[Unit]
Description=Sauvegarde de la base Kivien
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/kivien-sauvegarde
UNIT
cat > /etc/systemd/system/kivien-sauvegarde.timer <<'UNIT'
[Unit]
Description=Sauvegarde Kivien chaque nuit à 3 h 17, heure de La Réunion

[Timer]
OnCalendar=*-*-* 03:17:00 Indian/Reunion
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now kivien-sauvegarde.timer >> "$JOURNAL" 2>&1
info "prochaine sauvegarde : $(systemctl show kivien-sauvegarde.timer -p NextElapseUSecRealtime --value)"
/usr/local/sbin/kivien-sauvegarde | tee -a "$JOURNAL" || arret "la première sauvegarde a échoué."

# ---------------------------------------------------------------------------
etape "9/9 Vérification"
KIVIEN_SUPABASE="$ICI" bash "$SOURCE/deploy/vps/verifier.sh" | tee -a "$JOURNAL" || true

cat <<FIN

Installation terminée.

À reporter dans les apps (valeurs publiques, sans risque) :
  NEXT_PUBLIC_SUPABASE_URL=https://$DOMAINE
  EXPO_PUBLIC_SUPABASE_URL=https://$DOMAINE
  ANON_KEY=$(lire ANON_KEY)

Secrets (ne jamais les copier dans un message ni dans le dépôt) : $ICI/.env
Tableau de bord Supabase, par tunnel SSH depuis ton ordinateur :
  ssh -L $port:127.0.0.1:$port root@<ip-du-vps>   puis http://localhost:$port
  identifiant : kivien ; mot de passe : sudo grep DASHBOARD_PASSWORD $ICI/.env
Envoi des SMS : renseigner SMS_PROVIDER=twilio et SMS_TWILIO_* dans $ICI/.env, puis relancer ce script.
FIN
