#!/usr/bin/env bash
# Vérifie deploy/vps/offres-france-travail.sh sans Internet : Postgres local jetable et faux service
# France Travail (jeton, recherche paginée, offres anonymes, établissement déjà connu).
# Usage : scripts/verifier-offres.sh   (binaires PostgreSQL 16, python3)
set -euo pipefail
RACINE=$(cd "$(dirname "$0")/.." && pwd)
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d /var/tmp/kivien-offres.XXXX)
chmod 777 "$DIR"
PORT=5494
PORT_FT=5493
EN_PG() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
EN_PG "$BIN/initdb -D $DIR/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start >/dev/null"
trap 'kill $FT 2>/dev/null || true; EN_PG "$BIN/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -d k"
psql -h "$DIR" -p $PORT -U postgres -q -c "create database k"
$P -f "$RACINE/supabase/tests/stub-supabase.sql" 2>/dev/null
for f in "$RACINE"/supabase/migrations/*.sql; do $P -f "$f"; done
$P -f "$RACINE/supabase/seed.sql"

cat > "$DIR/ft.py" <<'PY'
import json, sys, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
port = int(sys.argv[1])
def offre(i, nom, rome="G1803", naf="56.10A", lieu="974 - ST PAUL", **autres):
    o = {"id": f"O{i}", "intitule": f"Serveur / Serveuse {i}", "romeCode": rome, "codeNAF": naf,
         "dateCreation": "2026-11-20T08:00:00.000Z", "lieuTravail": {"libelle": lieu, "latitude": -21.0, "longitude": 55.27},
         "origineOffre": {"urlOrigine": f"https://candidat.francetravail.fr/offres/recherche/detail/O{i}"}}
    if nom: o["entreprise"] = {"nom": nom}
    o.update(autres)
    return o
# G1803 : 152 offres sur deux pages (206 puis 200) ; G1602 : l'établissement déjà connu par OpenStreetMap.
SALLE = [offre(i, f"Restaurant {i}") for i in range(149)] + [
    offre(149, None),  # anonyme
    offre(150, "Hôtel Les Filaos", rome="G1703", naf="55.10Z", lieu="974 - STE MARIE",
          contact={"courriel": "rh@filaos.re", "telephone": "0262 00 11 22"}),
    offre(151, "Ti Kaz Bar", rome="G1801", naf="56.30Z"),
]
CUISINE = [offre(200, "LE BOUCAN GRILLE", rome="G1602", lieu="974 - SAINT GILLES LES BAINS",
                 dateCreation="2026-11-21T07:00:00.000Z", intitule="Commis de cuisine")]
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def repondre(self, code, corps=None):
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers()
        if corps is not None: self.wfile.write(json.dumps(corps).encode())
    def do_POST(self):
        corps = urllib.parse.parse_qs(self.rfile.read(int(self.headers["Content-Length"])).decode())
        assert self.path.startswith("/connexion/oauth2/access_token?realm=%2Fpartenaire"), self.path
        ok = corps.get("client_id") == ["id-essai"] and corps.get("client_secret") == ["secret-essai"]
        # Comme certaines applications : la portée « o2dsoffre » est refusée, la seconde portée passe.
        if ok and corps["scope"] == ["api_offresdemploiv2"]:
            return self.repondre(200, {"access_token": "JETON", "expires_in": 1499})
        self.repondre(400, {"error": "invalid_scope"})
    def do_GET(self):
        assert self.headers["Authorization"] == "Bearer JETON"
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        assert u.path == "/partenaire/offresdemploi/v2/offres/search" and q["departement"] == ["974"], self.path
        liste = {"G1803": SALLE, "G1602": CUISINE}.get(q["codeROME"][0], [])
        debut, fin = (int(x) for x in q["range"][0].split("-"))
        page = liste[debut:fin + 1]
        if not page: return self.repondre(204)
        self.repondre(206 if fin + 1 < len(liste) else 200, {"resultats": page})
HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
python3 -I "$DIR/ft.py" $PORT_FT &
FT=$!
for _ in $(seq 1 50); do python3 -I -c "import socket; socket.create_connection(('127.0.0.1', $PORT_FT), 0.2)" 2>/dev/null && break; sleep 0.1; done
printf 'FT_CLIENT_ID=id-essai\nFT_CLIENT_SECRET=secret-essai\n' > "$DIR/.env"
export KIVIEN_PSQL="psql -h $DIR -p $PORT -U postgres -d k" KIVIEN_SUPABASE="$DIR" KIVIEN_FT_URL="http://127.0.0.1:$PORT_FT"
echec() { echo "ÉCHEC : $*" >&2; exit 1; }

echo "--- 1. Établissement connu (OpenStreetMap) rapproché, nouveaux ajoutés, offres anonymes ignorées"
$P -c "insert into prospects (osm_id, nom, categorie, commune, email, source_email) values ('node/9', 'Le Boucan Grillé', 'restaurant', 'Saint-Gilles-les-Bains', 'contact@boucan.re', 'osm')"
bash "$RACINE/deploy/vps/offres-france-travail.sh"
[ "$($P -At -c "select offres || ' ' || ajoutes || ' ' || rapproches || ' ' || coalesce(erreur, '-') from releves_offres")" = "153 151 1 -" ] \
  || echec "bilan du relevé : $($P -At -c 'select * from releves_offres')"
[ "$($P -At -c "select count(*) from prospects where osm_id = 'node/9' and offre_intitule = 'Commis de cuisine' and recrute_le is not null and email = 'contact@boucan.re'")" = 1 ] \
  || echec "Le Boucan Grillé n'a pas été rapproché"
[ "$($P -At -c "select categorie || ' ' || commune || ' ' || email || ' ' || source_email || ' ' || telephone from prospects where nom = 'Hôtel Les Filaos' and osm_id like 'ft/%'")" = "hotel Sainte-Marie rh@filaos.re offre 0262 00 11 22" ] \
  || echec "fiche de l'hôtel : $($P -At -c "select categorie, commune, email, source_email, telephone from prospects where nom = 'Hôtel Les Filaos' and osm_id like 'ft/%'")"
[ "$($P -At -c "select categorie from prospects where nom = 'Ti Kaz Bar' and osm_id like 'ft/%'")" = bar ] || echec "catégorie du bar"
echo "OK  rapprochement, ajouts, catégories et communes"

echo "--- 2. Second relevé : rien en double"
bash "$RACINE/deploy/vps/offres-france-travail.sh" > /dev/null
[ "$($P -At -c "select count(*) from prospects where osm_id like 'ft/%'")" = 151 ] || echec "prospects en double"
[ "$($P -At -c "select ajoutes || ' ' || rapproches from releves_offres order by le desc limit 1")" = "0 152" ] || echec "second bilan"
echo "OK  aucun doublon"

echo "--- 3. Prospection automatique : ceux qui recrutent passent en premier"
$P <<'SQL'
update prospects set recrute_le = now() where osm_id like 'ft/%' or osm_id = 'node/9';
insert into prospects (osm_id, nom, categorie, commune, email, importe_le)
values ('node/1', 'Ancien Restaurant', 'restaurant', 'Saint-Paul', 'ancien@resto.re', now() - interval '1 year');
SQL
premier=$($P -At -c "select email from prospects_a_lancer('{ouest,nord,sud,est}') limit 1")
[ "$premier" != ancien@resto.re ] || echec "un établissement qui ne recrute pas passe en premier"
[ "$($P -At -c "select email from prospects_a_lancer('{ouest,nord,sud,est}') x offset (select count(*) - 1 from prospects_a_lancer('{ouest,nord,sud,est}'))")" = ancien@resto.re ] \
  || echec "l'établissement sans offre doit venir en dernier"
echo "OK  priorité à ceux qui recrutent"

echo "--- 4. Identifiants refusés : relevé noté en erreur"
printf 'FT_CLIENT_ID=id-essai\nFT_CLIENT_SECRET=mauvais\n' > "$DIR/.env"
if bash "$RACINE/deploy/vps/offres-france-travail.sh" > /dev/null 2>&1; then echec "relevé réussi avec de mauvais identifiants"; fi
$P -At -c "select erreur from releves_offres order by le desc limit 1" | grep -q "Identifiants refusés" || echec "erreur non notée"
echo "OK  erreur notée"
echo "Offres France Travail : tout est conforme."
