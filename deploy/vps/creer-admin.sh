#!/usr/bin/env bash
# Crée (ou réinitialise) un compte administrateur de la plateforme, connecté par e-mail sur
# kivien.re/admin. Le mot de passe s'affiche une seule fois : le noter, puis le changer si besoin
# en relançant ce script.
#
# Usage : sudo deploy/vps/creer-admin.sh "cabinet@taochyconsulting.fr"
set -euo pipefail

EMAIL=${1:?Adresse e-mail attendue}
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
PORT=$(lire KIVIEN_PORT_API)
SERVICE=$(lire SERVICE_ROLE_KEY)
EMAIL=$(tr '[:upper:]' '[:lower:]' <<<"$EMAIL")
if ! [[ "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$ ]]; then
  echo "Adresse e-mail invalide : $EMAIL" >&2
  exit 1
fi

# Connexion par e-mail : activée une fois (l'inscription libre reste soumise à confirmation).
if [ "$(lire ENABLE_EMAIL_SIGNUP)" != true ] || [ "$(lire ENABLE_EMAIL_AUTOCONFIRM)" != false ]; then
  sed -i -E 's/^ENABLE_EMAIL_SIGNUP=.*/ENABLE_EMAIL_SIGNUP=true/; s/^ENABLE_EMAIL_AUTOCONFIRM=.*/ENABLE_EMAIL_AUTOCONFIRM=false/' "$ICI/.env"
  echo "Connexion par e-mail activée : redémarrage du service d'authentification."
  (cd "$ICI" && docker compose up -d --wait auth >/dev/null)
fi

psql_db() { docker exec -i supabase-db psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
motdepasse=$(python3 -c 'import secrets; a="abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; print("".join(secrets.choice(a) for _ in range(16)))')
id=$(psql_db -At -v email="$EMAIL" <<<"select id from auth.users where lower(email) = :'email';")
corps=$(python3 -c 'import json,sys; print(json.dumps({"email": sys.argv[1], "password": sys.argv[2], "email_confirm": True}))' "$EMAIL" "$motdepasse")
if [ -z "$id" ]; then
  reponse=$(curl -s -w '\n%{http_code}' -X POST "http://127.0.0.1:$PORT/auth/v1/admin/users" \
    -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" -d @- <<<"$corps")
else
  reponse=$(curl -s -w '\n%{http_code}' -X PUT "http://127.0.0.1:$PORT/auth/v1/admin/users/$id" \
    -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" -d @- <<<"$corps")
fi
code=$(tail -n1 <<<"$reponse")
if [ "$code" != 200 ] && [ "$code" != 201 ]; then
  echo "Création du compte refusée (HTTP $code) : $(head -n1 <<<"$reponse" | grep -oE '"(msg|message|error_description)":"[^"]*"' || true)" >&2
  exit 1
fi
id=$(psql_db -At -v email="$EMAIL" <<<"select id from auth.users where lower(email) = :'email';")
psql_db -v id="$id" <<<"insert into admins (utilisateur_id) values (:'id') on conflict do nothing;"

echo
echo "Compte administrateur prêt : https://kivien.re/admin"
echo "  E-mail       : $EMAIL"
echo "  Mot de passe : $motdepasse   (affiché une seule fois)"
