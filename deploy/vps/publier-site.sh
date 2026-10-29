#!/usr/bin/env bash
# nginx et HTTPS pour kivien.re, www.kivien.re et app.kivien.re.
#   - écrit le fichier nginx du site s'il manque (ou toujours avec --regenerer), testé par nginx -t ;
#   - demande ou étend le certificat pour chaque nom qui pointe déjà vers ce VPS.
# Sans risque à relancer : ne touche ni aux autres sites du VPS ni au fichier de l'API.
#
# Usage : sudo deploy/vps/publier-site.sh [--regenerer]
set -euo pipefail

RACINE=${KIVIEN_RACINE:-/opt/kivien}
SOURCE=$RACINE/source
ICI=$RACINE/supabase
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
DOMAINE=$(lire KIVIEN_DOMAINE_SITE || true)
DOMAINE=${DOMAINE:-kivien.re}
PORT=$(lire KIVIEN_PORT_SITE || true)
PORT=${PORT:-18100}
EMAIL=$(lire CERTBOT_EMAIL || true)
REGENERER=${1:-}

if [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
  conf=/etc/nginx/sites-available/kivien-site.conf
  lien=/etc/nginx/sites-enabled/kivien-site.conf
else
  conf=/etc/nginx/conf.d/kivien-site.conf
  lien=
fi

# Un autre fichier nginx sert déjà ce domaine : on ne s'impose pas.
if grep -rlsE "server_name[^;]*[[:space:]](www\.|app\.)?${DOMAINE//./\\.}[[:space:];]" /etc/nginx | grep -v "kivien-site" | grep -q .; then
  echo "ARRÊT : $DOMAINE est déjà configuré dans un autre fichier nginx :" >&2
  grep -rlsE "server_name[^;]*[[:space:]](www\.|app\.)?${DOMAINE//./\\.}[[:space:];]" /etc/nginx | grep -v "kivien-site" >&2
  exit 1
fi

ancien=
restaurer() {
  if [ -n "$ancien" ]; then cp "$ancien" "$conf"; else rm -f "$conf" ${lien:+"$lien"}; fi
  nginx -t > /dev/null 2>&1 && systemctl reload nginx
}

if [ ! -f "$conf" ] || [ "$REGENERER" = "--regenerer" ]; then
  if [ -f "$conf" ]; then ancien=$(mktemp); cp "$conf" "$ancien"; fi
  sed -e "s#__DOMAINE__#$DOMAINE#g" -e "s#__PORT__#$PORT#g" -e "s#__WEB__#$RACINE/web#g" \
    "$SOURCE/deploy/vps/site/nginx-site.conf.modele" > "$conf"
  [ -n "$lien" ] && ln -sf "$conf" "$lien"
  if ! nginx -t > /dev/null 2>&1; then
    nginx -t 2>&1 | tail -5 >&2
    restaurer
    echo "ARRÊT : nginx -t a échoué, configuration du site précédente remise." >&2
    exit 1
  fi
  systemctl reload nginx
  echo "nginx : $conf écrit."
fi

# Noms qui pointent déjà vers ce VPS : seuls ceux-là peuvent recevoir un certificat.
ips=$(hostname -I)
noms=()
for n in "$DOMAINE" "www.$DOMAINE" "app.$DOMAINE"; do
  ip=$(getent ahostsv4 "$n" | awk 'NR==1 {print $1}' || true)
  if [ -n "$ip" ] && tr ' ' '\n' <<<"$ips" | grep -qx "$ip"; then
    noms+=("$n")
  else
    echo "HTTPS : $n ne pointe pas encore vers ce VPS (résolu : ${ip:-rien})."
  fi
done

if [ ${#noms[@]} -gt 0 ]; then
  couverts=$(certbot certificates --cert-name kivien-site 2>/dev/null | awk -F': ' '/Domains:/ {print $2}')
  manque=
  for n in "${noms[@]}"; do grep -qw -- "$n" <<<"$couverts" || manque=1; done
  if [ -n "$manque" ] || ! grep -q "ssl_certificate" "$conf"; then
    [ -n "$EMAIL" ] || { echo "ARRÊT : CERTBOT_EMAIL absent de $ICI/.env" >&2; exit 1; }
    # Copie de sécurité avant certbot, qui modifie le fichier.
    if [ -z "$ancien" ]; then ancien=$(mktemp); cp "$conf" "$ancien"; fi
    command -v certbot > /dev/null || apt-get install -y -q certbot python3-certbot-nginx > /dev/null
    args=()
    for n in "${noms[@]}"; do args+=(-d "$n"); done
    if ! certbot --nginx --cert-name kivien-site "${args[@]}" -m "$EMAIL" --agree-tos --redirect \
      --non-interactive --keep-until-expiring --expand > /dev/null 2>&1; then
      restaurer
      echo "ARRÊT : certbot a échoué pour ${noms[*]} (voir /var/log/letsencrypt/letsencrypt.log). Configuration précédente remise." >&2
      exit 1
    fi
    nginx -t > /dev/null 2>&1 && systemctl reload nginx
    echo "HTTPS : certificat en place pour ${noms[*]}."
  fi
fi
[ -n "$ancien" ] && rm -f "$ancien"
exit 0
