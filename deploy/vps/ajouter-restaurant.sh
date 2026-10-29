#!/usr/bin/env bash
# Crée un compte restaurateur (en attendant l'écran d'inscription restaurateur).
# Le restaurateur se connecte ensuite sur le site avec ce mobile et le code reçu par SMS.
#
# Usage : sudo deploy/vps/ajouter-restaurant.sh "+262692123456" "Le Boucan Grillé" "14 rue du Général de Gaulle, Saint-Gilles-les-Bains"
set -euo pipefail

TEL=${1:?Mobile du restaurateur, format +26269XXXXXXX}
NOM=${2:?Nom du restaurant}
ADRESSE=${3:?Adresse du restaurant}
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

# Compte d'authentification (téléphone confirmé), ou compte existant.
reponse=$(curl -s -w '\n%{http_code}' -X POST "http://127.0.0.1:$PORT/auth/v1/admin/users" \
  -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" \
  -d "{\"phone\":\"${TEL#+}\",\"phone_confirm\":true}")
code=${reponse##*$'\n'}
if [ "$code" != 200 ] && [ "$code" != 201 ] && [ "$code" != 422 ]; then
  echo "Création du compte impossible (HTTP $code)" >&2
  exit 1
fi

docker exec -i supabase-db psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  -v tel="${TEL#+}" -v nom="$NOM" -v telresto="$TEL" -v voie="$VOIE" -v cp="$CP" -v commune="$COMMUNE" \
  -v lat="$LAT" -v lng="$LNG" <<'SQL'
insert into restaurants (proprietaire, nom, telephone, adresse, code_postal, commune, lat, lng)
select u.id, :'nom', :'telresto', :'voie', :'cp', :'commune', :'lat'::double precision, :'lng'::double precision
from auth.users u
where u.phone = :'tel'
  and not exists (select 1 from restaurants r where r.proprietaire = u.id)
returning nom || ' créé.' as resultat;
SQL
echo "Le restaurateur peut se connecter sur le site avec $TEL."
