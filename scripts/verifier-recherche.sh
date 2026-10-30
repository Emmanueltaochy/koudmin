#!/usr/bin/env bash
# Vérifie deploy/vps/recherche-prospects.sh sans Internet : Postgres local jetable (comme
# verifier-sql.sh), faux serveurs OpenStreetMap (le premier en panne, le second répond) et faux site
# d'établissement qui donne son e-mail sur sa page contact.
# Usage : scripts/verifier-recherche.sh   (binaires PostgreSQL 16, python3)
set -euo pipefail
RACINE=$(cd "$(dirname "$0")/.." && pwd)
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d /var/tmp/kivien-rech.XXXX)
chmod 777 "$DIR"
PORT=5498
PORT_WEB=8765
EN_PG() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
EN_PG "$BIN/initdb -D $DIR/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start >/dev/null"

# Faux serveurs : /panne répond 504, /overpass renvoie trois lieux, /bistrot/contact donne une adresse.
python3 -I - "$PORT_WEB" > "$DIR/web.log" 2>&1 <<'PY' &
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
port = int(sys.argv[1])
ELEMENTS = [
    {"type": "node", "id": 1, "lat": -21.0, "lon": 55.27,
     "tags": {"name": "Le Bistrot", "amenity": "restaurant", "website": f"http://127.0.0.1:{port}/bistrot"}},
    {"type": "way", "id": 2, "center": {"lat": -21.13, "lon": 55.47},
     "tags": {"name": "Hôtel des Hauts", "tourism": "hotel", "contact:email": "Reception@HotelDesHauts.re", "addr:city": "Cilaos"}},
    {"type": "node", "id": 3, "tags": {"amenity": "bar"}},
]
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def repondre(self, code, corps, type_="application/json"):
        self.send_response(code); self.send_header("Content-Type", type_); self.end_headers(); self.wfile.write(corps.encode())
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0); corps = self.rfile.read(n).decode()
        assert self.headers.get("User-Agent", "").startswith("Kivien/"), "User-Agent manquant"
        if self.path == "/panne": return self.repondre(504, "Gateway Timeout", "text/plain")
        tourisme = "tourism" in corps
        self.repondre(200, json.dumps({"elements": [e for e in ELEMENTS if ("tourism" in e["tags"]) == tourisme or "name" not in e["tags"]]}))
    def do_GET(self):
        if self.path == "/bistrot/contact":
            return self.repondre(200, "<p>Écrivez-nous : resa [at] bistrot.re <img src='logo@2x.png'></p>", "text/html")
        if self.path == "/bistrot":
            return self.repondre(200, "<p>Bienvenue</p>", "text/html")
        self.repondre(404, "", "text/html")
HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
WEB=$!
trap 'kill $WEB 2>/dev/null; EN_PG "$BIN/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf "$DIR"' EXIT

P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database k"
$P -d k -f "$RACINE/supabase/tests/stub-supabase.sql" 2>/dev/null
for f in "$RACINE"/supabase/migrations/*.sql; do $P -d k -f "$f"; done
sleep 1

export KIVIEN_PSQL="psql -h $DIR -p $PORT -U postgres -d k" KIVIEN_SOURCE="$RACINE"
export no_proxy="127.0.0.1,localhost${no_proxy:+,$no_proxy}" NO_PROXY="127.0.0.1,localhost${NO_PROXY:+,$NO_PROXY}"

echo "--- 1. Premier serveur en panne, le second répond ; e-mail trouvé sur la page contact"
KIVIEN_OVERPASS="http://127.0.0.1:$PORT_WEB/panne http://127.0.0.1:$PORT_WEB/overpass" \
  bash "$RACINE/deploy/vps/recherche-prospects.sh"
resultat=$($P -d k -At -c "select string_agg(concat_ws(':', nom, categorie, commune, email, source_email), ' / ' order by nom) from prospects")
attendu="Hôtel des Hauts:hotel:Cilaos:reception@hoteldeshauts.re:osm / Le Bistrot:restaurant:Saint-Paul:resa@bistrot.re:site"
[ "$resultat" = "$attendu" ] || { echo "ÉCHEC : $resultat" >&2; exit 1; }
[ "$($P -d k -At -c "select statut || ':' || trouves || ':' || emails_trouves from recherches_prospects")" = "terminee:2:1" ] \
  || { echo "ÉCHEC : bilan $($P -d k -At -c 'select * from recherches_prospects')" >&2; exit 1; }

echo "--- 2. Tous les serveurs en panne : recherche en échec, avec le message exact"
KIVIEN_OVERPASS="http://127.0.0.1:$PORT_WEB/panne" bash "$RACINE/deploy/vps/recherche-prospects.sh"
erreur=$($P -d k -At -c "select erreur from recherches_prospects where statut = 'echouee'")
grep -q "127.0.0.1 : HTTP Error 504" <<<"$erreur" || { echo "ÉCHEC : erreur « $erreur »" >&2; exit 1; }

echo "--- 3. Minuteur : rien sans demande récente ; une demande de l'admin est prise"
avant=$($P -d k -At -c "select count(*) from recherches_prospects")
KIVIEN_OVERPASS="http://127.0.0.1:$PORT_WEB/overpass" bash "$RACINE/deploy/vps/recherche-prospects.sh" --si-demande
[ "$($P -d k -At -c "select count(*) from recherches_prospects")" = "$avant" ] || { echo "ÉCHEC : recherche sans demande" >&2; exit 1; }
$P -d k -c "insert into recherches_prospects default values"
KIVIEN_OVERPASS="http://127.0.0.1:$PORT_WEB/overpass" bash "$RACINE/deploy/vps/recherche-prospects.sh" --si-demande
[ "$($P -d k -At -c "select statut from recherches_prospects order by demandee_le desc limit 1")" = terminee ] \
  || { echo "ÉCHEC : demande non traitée" >&2; exit 1; }
echo "Recherche des établissements conforme."
