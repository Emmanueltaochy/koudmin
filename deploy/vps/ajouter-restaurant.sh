#!/usr/bin/env bash
# Crée un compte restaurateur (en attendant l'écran d'inscription restaurateur).
# Le restaurateur se connecte ensuite sur le site avec ce mobile et le mot de passe affiché une fois.
#
# Usage : sudo deploy/vps/ajouter-restaurant.sh "+262692123456" "Le Boucan Grillé" "14 rue du Général de Gaulle, Saint-Gilles-les-Bains"
#
# Si le numéro a déjà un compte (inscription libre), le script refuse : n'importe qui peut s'inscrire
# avec n'importe quel numéro tant que les SMS ne sont pas en place. Vérifier que le numéro est bien
# celui du restaurateur, lancer reinitialiser-mot-de-passe.sh (coupe les sessions ouvertes), puis
# relancer ce script avec --compte-existant en dernier argument.
set -euo pipefail

TEL=${1:?Mobile du restaurateur, format +26269XXXXXXX}
NOM=${2:?Nom du restaurant}
ADRESSE=${3:?Adresse du restaurant}
EXISTANT=${4:-}
ICI=${KIVIEN_SUPABASE:-/opt/kivien/supabase}
lire() { grep -E "^$1=" "$ICI/.env" | tail -n1 | cut -d= -f2-; }
PORT=$(lire KIVIEN_PORT_API)
SERVICE=$(lire SERVICE_ROLE_KEY)

if ! [[ "$TEL" =~ ^\+262(69[23])[0-9]{6}$ ]]; then
  echo "Mobile invalide : attendu +262692… ou +262693…" >&2
  exit 1
fi

# Géocodage (base adresse nationale), limité à La Réunion.
geo=$(curl -fsS --get "https://data.geopf.fr/geocodage/search" --data-urlencode "q=$ADRESSE" \
  --data "limit=5" --data "index=address" --data "lat=-21.115" --data "lon=55.536" | python3 -c '
import json, sys
for f in json.load(sys.stdin)["features"]:
    p = f["properties"]
    if str(p.get("postcode", "")).startswith("974"):
        lng, lat = f["geometry"]["coordinates"]
        print("\t".join([p["name"], p["postcode"], p["city"], str(lat), str(lng), p["label"]]))
        break
')
if [ -z "$geo" ]; then
  echo "Adresse introuvable à La Réunion : $ADRESSE" >&2
  exit 1
fi
IFS=$'\t' read -r VOIE CP COMMUNE LAT LNG LIBELLE <<<"$geo"
echo "Adresse retenue : $LIBELLE"

# Compte d'authentification : nouveau, avec un mot de passe tiré au hasard.
psql_db() { docker exec -i supabase-db psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
existe=$(psql_db -At -v tel="${TEL#+}" <<<"select count(*) from auth.users where phone = :'tel';")
motdepasse=
if [ "$existe" != 0 ]; then
  if [ "$EXISTANT" != "--compte-existant" ]; then
    echo "Ce numéro a déjà un compte. Vérifier qu'il appartient bien au restaurateur, lancer" >&2
    echo "reinitialiser-mot-de-passe.sh $TEL puis relancer avec --compte-existant." >&2
    exit 1
  fi
else
  motdepasse=$(python3 -c 'import secrets; a="abcdefghjkmnpqrstuvwxyz23456789"; print("".join(secrets.choice(a) for _ in range(12)))')
  corps=$(python3 -c 'import json,sys; print(json.dumps({"phone": sys.argv[1], "password": sys.argv[2], "phone_confirm": True}))' "${TEL#+}" "$motdepasse")
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/auth/v1/admin/users" \
    -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" -d @- <<<"$corps")
  if [ "$code" != 200 ] && [ "$code" != 201 ]; then
    echo "Création du compte impossible (HTTP $code)" >&2
    exit 1
  fi
fi

psql_db \
  -v tel="${TEL#+}" -v nom="$NOM" -v telresto="$TEL" -v voie="$VOIE" -v cp="$CP" -v commune="$COMMUNE" \
  -v lat="$LAT" -v lng="$LNG" <<'SQL'
insert into restaurants (proprietaire, nom, telephone, adresse, code_postal, commune, lat, lng)
select u.id, :'nom', :'telresto', :'voie', :'cp', :'commune', :'lat'::double precision, :'lng'::double precision
from auth.users u
where u.phone = :'tel'
  and not exists (select 1 from restaurants r where r.proprietaire = u.id)
returning nom || ' créé.' as resultat;
SQL
if [ -n "$motdepasse" ]; then
  echo "Le restaurateur se connecte sur le site avec $TEL et ce mot de passe (affiché une seule fois) :"
  echo "  $motdepasse"
else
  echo "Le restaurateur se connecte sur le site avec $TEL et le mot de passe réinitialisé."
fi
