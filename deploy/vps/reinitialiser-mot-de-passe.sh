#!/usr/bin/env bash
# Donne un nouveau mot de passe à un compte (restaurateur ou extra) et ferme ses sessions ouvertes.
# Sert aussi en cas d'oubli, tant qu'il n'y a pas de réinitialisation par SMS.
#
# Usage : sudo deploy/vps/reinitialiser-mot-de-passe.sh "+262692123456"
set -euo pipefail

TEL=${1:?Mobile du compte, format +26269XXXXXXX}
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
PORT=$(lire KIVIEN_PORT_API)
SERVICE=$(lire SERVICE_ROLE_KEY)
psql_db() { docker exec -i supabase-db psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

if ! [[ "$TEL" =~ ^\+262(69[23])[0-9]{6}$ ]]; then
  echo "Mobile invalide : attendu +262692… ou +262693…" >&2
  exit 1
fi
id=$(psql_db -At -v tel="${TEL#+}" <<<"select id from auth.users where phone = :'tel';")
if [ -z "$id" ]; then
  echo "Aucun compte pour $TEL." >&2
  exit 1
fi

motdepasse=$(python3 -c 'import secrets; a="abcdefghjkmnpqrstuvwxyz23456789"; print("".join(secrets.choice(a) for _ in range(12)))')
corps=$(python3 -c 'import json,sys; print(json.dumps({"password": sys.argv[1], "phone_confirm": True}))' "$motdepasse")
code=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "http://127.0.0.1:$PORT/auth/v1/admin/users/$id" \
  -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" -d @- <<<"$corps")
if [ "$code" != 200 ]; then
  echo "Mise à jour impossible (HTTP $code)" >&2
  exit 1
fi
# Les appareils déjà connectés (y compris un usurpateur éventuel) doivent se reconnecter.
psql_db -v id="$id" <<<"delete from auth.sessions where user_id = :'id'::uuid;"

echo "Nouveau mot de passe pour $TEL (affiché une seule fois) :"
echo "  $motdepasse"
