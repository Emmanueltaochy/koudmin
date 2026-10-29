#!/usr/bin/env bash
# Vérifie l'installation Kivien sur le VPS. Aucun secret affiché.
# Usage : sudo deploy/vps/verifier.sh
set -uo pipefail

ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
PORT=$(lire KIVIEN_PORT_API)
ANON=$(lire ANON_KEY)
DOMAINE=$(lire KIVIEN_DOMAINE_API)
echecs=0
ok() { echo "OK    $1"; }
ko() { echo "ÉCHEC $1"; echecs=$((echecs + 1)); }

for c in supabase-db supabase-auth supabase-rest realtime-dev.supabase-realtime supabase-envoy supabase-studio; do
  etat=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$c" 2>/dev/null || echo absent)
  case "$etat" in "running healthy"|"running ") ok "$c : $etat" ;; *) ko "$c : $etat" ;; esac
done

code=$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON" "http://127.0.0.1:$PORT/auth/v1/health")
[ "$code" = 200 ] && ok "authentification (local) : $code" || ko "authentification (local) : $code"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON" "http://127.0.0.1:$PORT/rest/v1/parametres?select=date_effet")
[ "$code" = 200 ] && ok "API REST (local) : $code" || ko "API REST (local) : $code"

# Rien de Kivien ne doit écouter hors de la machine.
if docker port supabase-pooler 2>/dev/null | grep -q .; then ko "le pooler Postgres est publié"; else ok "pooler Postgres non publié"; fi
if docker port supabase-envoy 2>/dev/null | grep -vq '^8000/tcp -> 127.0.0.1:'; then ko "passerelle publiée hors 127.0.0.1"; else ok "passerelle limitée à 127.0.0.1"; fi

if [ -n "$DOMAINE" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON" "https://$DOMAINE/auth/v1/health")
  [ "$code" = 200 ] && ok "https://$DOMAINE/auth/v1/health : $code" || ko "https://$DOMAINE/auth/v1/health : $code"
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAINE/")
  [ "$code" = 404 ] && ok "tableau de bord non exposé publiquement : $code" || ko "https://$DOMAINE/ répond $code (attendu 404)"
fi

# Site kivien.re et app web.
PORT_SITE=$(lire KIVIEN_PORT_SITE)
DOMAINE_SITE=$(lire KIVIEN_DOMAINE_SITE)
etat=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' kivien-site 2>/dev/null || echo absent)
[ "$etat" = "running healthy" ] && ok "kivien-site : $etat" || ko "kivien-site : $etat"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT_SITE:-18100}/")
[ "$code" = 200 ] && ok "site (local) : $code" || ko "site (local) : $code"
[ -f "${KIVIEN_RACINE:-/opt/kivien}/web/app/index.html" ] && ok "app web présente" || ko "app web absente"
for n in "${DOMAINE_SITE:-kivien.re}" "app.${DOMAINE_SITE:-kivien.re}"; do
  ip=$(getent ahostsv4 "$n" | awk 'NR==1 {print $1}' || true)
  if [ -z "$ip" ] || ! hostname -I | tr ' ' '\n' | grep -qx "$ip"; then
    echo "INFO  $n ne pointe pas encore vers ce VPS (DNS)"
    continue
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$n/")
  [ "$code" = 200 ] && ok "https://$n/ : $code" || ko "https://$n/ : $code"
done

n=$(docker exec supabase-db psql -h localhost -U postgres -d postgres -Atc "select count(*) from kivien_admin.migrations" 2>/dev/null || echo 0)
[ "${n:-0}" -ge 1 ] && ok "migrations appliquées : $n" || ko "migrations absentes"
ls /var/backups/kivien/kivien-*.dump >/dev/null 2>&1 && ok "sauvegarde présente" || ko "aucune sauvegarde"

echo
[ "$echecs" -eq 0 ] && echo "Tout est en ordre." || echo "$echecs point(s) à corriger."
exit "$echecs"
