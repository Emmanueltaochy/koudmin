#!/usr/bin/env bash
# Met le VPS à jour vers un commit de la branche de production, à la demande de GitHub Actions.
#
# Installé en /usr/local/sbin/kivien-mise-a-jour. La clé SSH de GitHub ne peut lancer que ce script
# (commande forcée dans authorized_keys, voir autoriser-github.sh) et ne lui transmet qu'une ligne :
#   deployer <sha de 40 caractères>
# Le commit doit être la dernière version de la branche de production : une clé volée ne permet ni
# d'exécuter autre chose, ni de revenir à une version ancienne.
#
# Usage manuel : sudo kivien-mise-a-jour deployer <sha>
set -euo pipefail

demande=${SSH_ORIGINAL_COMMAND:-$*}
if ! [[ "$demande" =~ ^deployer\ ([0-9a-f]{40})$ ]]; then
  echo "Commande refusée. Attendu : deployer <sha>" >&2
  exit 2
fi
SHA=${BASH_REMATCH[1]}
BRANCHE=${KIVIEN_BRANCHE_PROD:-main}
RACINE=${KIVIEN_RACINE:-/opt/kivien}
SOURCE=$RACINE/source
ICI=$RACINE/supabase
JOURNAL=/var/log/kivien-mises-a-jour.log

touch "$JOURNAL" && chmod 600 "$JOURNAL"
exec > >(tee -a "$JOURNAL") 2>&1
echo "--- $(date -u +%FT%TZ) mise à jour demandée : $SHA"

# Une seule mise à jour à la fois.
exec 9> /run/lock/kivien-mise-a-jour.lock
flock -w 900 9 || { echo "Une autre mise à jour est en cours depuis plus de 15 min." >&2; exit 1; }

lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }

git -C "$SOURCE" fetch -q --depth 1 origin "$BRANCHE"
derniere=$(git -C "$SOURCE" rev-parse FETCH_HEAD)
if [ "$derniere" != "$SHA" ]; then
  echo "$SHA n'est plus la dernière version de $BRANCHE ($derniere) : rien à faire, la suivante sera déployée."
  exit 0
fi

avant=$(git -C "$SOURCE" rev-parse HEAD)
if [ "$avant" = "$SHA" ]; then
  echo "Déjà à jour."
  changements=
else
  # Les arbres des deux commits sont présents : la comparaison ne demande pas l'historique.
  changements=$(git -C "$SOURCE" diff --name-only "$avant" "$SHA" 2>/dev/null || echo "deploy/vps/inconnu")
  echo "Fichiers modifiés : $(wc -l <<<"$changements")"
fi

if grep -q '^supabase/migrations/' <<<"$changements"; then
  echo "Nouvelles migrations : sauvegarde avant de les appliquer."
  "${KIVIEN_SAUVEGARDE:-/usr/local/sbin/kivien-sauvegarde}"
fi

if grep -q '^deploy/vps/' <<<"$changements"; then
  # Configuration du serveur modifiée : installeur complet (idempotent, secrets conservés),
  # qui reconstruit aussi le site et l'app web.
  echo "Configuration du serveur modifiée : installeur complet."
  installeur=$(mktemp)
  git -C "$SOURCE" show "$SHA:deploy/vps/installer.sh" > "$installeur"
  KIVIEN_EMAIL=$(lire CERTBOT_EMAIL) KIVIEN_REF=$SHA bash "$installeur"
  rm -f "$installeur"
else
  git -C "$SOURCE" checkout -q --force "$SHA"
  if grep -q '^supabase/migrations/' <<<"$changements"; then
    bash "$SOURCE/deploy/vps/appliquer-migrations.sh" "$SOURCE/supabase/migrations"
  fi
  # Site et app web : reconstruits si leur code a changé, ou s'ils ne tournent pas.
  if grep -qE '^(apps/|packages/|package\.json|pnpm-lock\.yaml|\.dockerignore)' <<<"$changements" \
    || [ "$(docker inspect -f '{{.State.Running}}' kivien-site 2>/dev/null)" != true ]; then
    bash "$SOURCE/deploy/vps/deployer-site.sh"
  fi
  # nginx du site et certificats : obtenus dès que les noms pointent vers ce VPS.
  bash "$SOURCE/deploy/vps/publier-site.sh"
fi
echo "Version en place : $(git -C "$SOURCE" rev-parse --short HEAD)"
# Le résultat de la vérification fait le résultat du déploiement (vert ou rouge dans GitHub).
bash "$SOURCE/deploy/vps/verifier.sh"
