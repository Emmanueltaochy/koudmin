#!/usr/bin/env bash
# Construit et met en service, depuis /opt/kivien/source :
#   - le site kivien.re (page d'accueil + espace restaurateur), conteneur « kivien-site » ;
#   - l'app extra en version web (app.kivien.re), fichiers statiques dans /opt/kivien/web/app.
# Le nouveau site est démarré à côté et vérifié avant de remplacer l'ancien : en cas d'échec,
# l'ancienne version reste en ligne.
#
# Usage : sudo deploy/vps/deployer-site.sh
set -euo pipefail

RACINE=${KIVIEN_RACINE:-/opt/kivien}
SOURCE=$RACINE/source
ICI=$RACINE/supabase
WEB=$RACINE/web
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }

DOMAINE_API=$(lire KIVIEN_DOMAINE_API)
ANON=$(lire ANON_KEY)
PORT=$(lire KIVIEN_PORT_SITE || true)
PORT=${PORT:-18100}
[ -n "$DOMAINE_API" ] && [ -n "$ANON" ] || { echo "KIVIEN_DOMAINE_API ou ANON_KEY absent de $ICI/.env" >&2; exit 1; }

version=$(git -C "$SOURCE" rev-parse --short=12 HEAD)
image="kivien-site:$version"
export DOCKER_BUILDKIT=1
# KIVIEN_CA : certificat racine supplémentaire pour la construction (proxy d'entreprise), facultatif.
construire() {
  docker build -q -f "$SOURCE/deploy/vps/site/Dockerfile" ${KIVIEN_CA:+--secret "id=ca,src=$KIVIEN_CA"} "$@" "$SOURCE" > /dev/null
}

echo "Site : construction de $image"
construire --target site \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://$DOMAINE_API" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
  -t "$image"

echo "App web : construction"
install -d -m 755 "$WEB"
nouveau="$WEB/app-$version"
# Construction dans un dossier temporaire : la version en ligne n'est jamais touchée pendant ce temps.
tmp="$WEB/.construction-$$"
rm -rf "$tmp"
construire --target app-web \
  --build-arg EXPO_PUBLIC_SUPABASE_URL="https://$DOMAINE_API" \
  --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
  --output "type=local,dest=$tmp"
[ -f "$tmp/index.html" ] || { echo "App web : index.html absent après construction" >&2; rm -rf "$tmp"; exit 1; }
chmod -R a+rX "$tmp"

# Essai du nouveau site sur un port voisin, avant de toucher à la version en ligne.
attendre_sante() {
  local nom=$1
  for _ in $(seq 1 60); do
    case "$(docker inspect -f '{{.State.Health.Status}}' "$nom" 2>/dev/null)" in
      healthy) return 0 ;;
      unhealthy) return 1 ;;
    esac
    sleep 2
  done
  return 1
}
lancer() {
  docker run -d --name "$1" --restart unless-stopped --memory 768m \
    --label kivien=site -p "127.0.0.1:$2:3000" "$image" > /dev/null
}
docker rm -f kivien-site-essai > /dev/null 2>&1 || true
lancer kivien-site-essai $((PORT + 1))
if ! attendre_sante kivien-site-essai || ! curl -fsS -o /dev/null "http://127.0.0.1:$((PORT + 1))/"; then
  echo "Site : la nouvelle version ne répond pas, l'ancienne reste en ligne. Journal :" >&2
  docker logs --tail 30 kivien-site-essai >&2 || true
  docker rm -f kivien-site-essai > /dev/null
  exit 1
fi
docker rm -f kivien-site-essai > /dev/null

# Bascule : quelques secondes d'indisponibilité au plus.
docker rm -f kivien-site > /dev/null 2>&1 || true
lancer kivien-site "$PORT"
attendre_sante kivien-site || { echo "Site : kivien-site ne démarre pas" >&2; docker logs --tail 30 kivien-site >&2; exit 1; }

# App web : bascule atomique du lien « app » vers la nouvelle version.
rm -rf "$nouveau.ancien"
[ -d "$nouveau" ] && mv "$nouveau" "$nouveau.ancien"
mv "$tmp" "$nouveau"
ln -sfn "app-$version" "$WEB/app.tmp"
mv -T "$WEB/app.tmp" "$WEB/app"
rm -rf "$nouveau.ancien"

# Ménage : on garde les 3 dernières versions de l'app et de l'image.
find "$WEB" -maxdepth 1 -type d -name 'app-*' ! -name '*.ancien' -printf '%T@ %p\n' | sort -rn | tail -n +4 | cut -d' ' -f2- | xargs -r rm -rf
docker images kivien-site --format '{{.CreatedAt}}\t{{.Repository}}:{{.Tag}}' | sort -r | tail -n +4 | cut -f2 \
  | xargs -r docker rmi > /dev/null 2>&1 || true
docker builder prune -f --filter until=168h > /dev/null 2>&1 || true

echo "Site et app web en ligne : version $version (port local $PORT)."
