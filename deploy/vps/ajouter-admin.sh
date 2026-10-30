#!/usr/bin/env bash
# Donne l'accès au compteur de recrutement (kivien.re/admin) à un compte existant.
# Le compte se crée d'abord normalement (inscription établissement ou invitation), avec ce mobile.
#
# Usage : sudo deploy/vps/ajouter-admin.sh "+262692123456"
#         sudo deploy/vps/ajouter-admin.sh "+262692123456" --retirer
set -euo pipefail

TEL=${1:?Mobile du compte, format +26269XXXXXXX}
ACTION=${2:-}
if ! [[ "$TEL" =~ ^\+262(69[23])[0-9]{6}$ ]]; then
  echo "Mobile invalide : attendu +262692… ou +262693…" >&2
  exit 1
fi
psql_db() { docker exec -i supabase-db psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

id=$(psql_db -At -v tel="${TEL#+}" <<<"select id from auth.users where phone = :'tel';")
if [ -z "$id" ]; then
  echo "Aucun compte avec ce mobile. Créer d'abord le compte sur kivien.re, puis relancer." >&2
  exit 1
fi
if [ "$ACTION" = "--retirer" ]; then
  psql_db -v id="$id" <<<"delete from admins where utilisateur_id = :'id';"
  echo "Accès au compteur retiré pour $TEL."
else
  psql_db -v id="$id" <<<"insert into admins (utilisateur_id) values (:'id') on conflict do nothing;"
  echo "Accès au compteur ouvert pour $TEL : https://kivien.re/admin"
fi
