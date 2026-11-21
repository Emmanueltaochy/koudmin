#!/usr/bin/env bash
# Vérifie deploy/vps/offres-france-travail.sh sans Internet : Postgres local jetable et faux service
# La Bonne Boite (jeton, recherche paginée, fiche sans nom, établissement déjà connu, fort potentiel).
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
def ent(i, nom, rome="G1803", naf="5610A", ville="Saint-Paul", fort=False, office=""):
    return {"rome": rome, "id": i, "siret": f"{i:014d}", "company_name": nom, "office_name": office, "naf": naf,
            "location": {"lat": -21.0, "lon": 55.27}, "city": ville, "postcode": "97460", "department_number": "974",
            "hiring_potential": 80.0 if fort else 2.0, "is_high_potential": fort}
# 103 fiches sur deux pages de 100 : 99 restaurants, une entreprise sans nom, l'hôtel (fort potentiel,
# deux métiers), le bar, et l'établissement déjà connu par OpenStreetMap (nom d'enseigne).
TOUT = [ent(i, f"RESTAURANT {i}") for i in range(99)] + [
    ent(99, ""),
    ent(100, "SARL FILAOS", rome="G1703", naf="5510Z", ville="Sainte-Marie", fort=True, office="HOTEL LES FILAOS"),
    ent(100, "SARL FILAOS", rome="G1501", naf="5510Z", ville="Sainte-Marie", fort=True, office="HOTEL LES FILAOS"),
    ent(101, "Ti Kaz Bar", rome="G1801", naf="5630Z"),
    ent(102, "SAS BOUCAN", rome="G1602", ville="Saint-Gilles-les-Bains", fort=True, office="LE BOUCAN GRILLÉ"),
]
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def repondre(self, code, corps=None):
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers()
        if corps is not None: self.wfile.write(json.dumps(corps).encode())
    def do_POST(self):
        corps = urllib.parse.parse_qs(self.rfile.read(int(self.headers["Content-Length"])).decode())
        assert self.path.startswith("/connexion/oauth2/access_token?realm=%2Fpartenaire"), self.path
        ok = corps.get("client_id") == ["id-essai"] and corps.get("client_secret") == ["secret-essai"]
        if ok and corps["scope"] == ["api_labonneboitev2"]:
            return self.repondre(200, {"access_token": "JETON", "expires_in": 1499})
        self.repondre(401, {"error": "invalid_client"})
    def do_GET(self):
        assert self.headers["Authorization"] == "Bearer JETON"
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        assert u.path == "/partenaire/labonneboite/v2/search/", u.path
        assert q["department_number"] == ["974"] and "G1803" in q["rome"] and len(q["rome"]) == 7, q
        page, taille = int(q["page"][0]), int(q["page_size"][0])
        items = TOUT[(page - 1) * taille: page * taille]
        self.repondre(200, {"hits": len(TOUT), "items": items})
HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
python3 -I "$DIR/ft.py" $PORT_FT &
FT=$!
for _ in $(seq 1 50); do python3 -I -c "import socket; socket.create_connection(('127.0.0.1', $PORT_FT), 0.2)" 2>/dev/null && break; sleep 0.1; done
printf 'FT_CLIENT_ID=id-essai\nFT_CLIENT_SECRET=secret-essai\n' > "$DIR/.env"
export KIVIEN_PSQL="psql -h $DIR -p $PORT -U postgres -d k" KIVIEN_SUPABASE="$DIR" KIVIEN_FT_URL="http://127.0.0.1:$PORT_FT" KIVIEN_FT_PAUSE=0
echec() { echo "ÉCHEC : $*" >&2; exit 1; }

echo "--- 1. Établissement connu (OpenStreetMap) rapproché, nouveaux ajoutés, fiche sans nom ignorée"
$P -c "insert into prospects (osm_id, nom, categorie, commune, email, source_email) values ('node/9', 'Le Boucan Grillé', 'restaurant', 'Saint-Gilles-les-Bains', 'contact@boucan.re', 'osm')"
bash "$RACINE/deploy/vps/offres-france-travail.sh"
[ "$($P -At -c "select offres || ' ' || ajoutes || ' ' || rapproches || ' ' || coalesce(erreur, '-') from releves_offres")" = "103 101 1 -" ] \
  || echec "bilan du relevé : $($P -At -c 'select * from releves_offres')"
[ "$($P -At -c "select count(*) from prospects where osm_id = 'node/9' and offre_intitule = 'Fort potentiel d''embauche (cuisine)' and recrute_le is not null and email = 'contact@boucan.re'")" = 1 ] \
  || echec "Le Boucan Grillé n'a pas été rapproché : $($P -At -c "select osm_id, offre_intitule, recrute_le from prospects where nom ilike '%boucan%'")"
[ "$($P -At -c "select categorie || ' ' || commune || ' ' || offre_intitule from prospects where nom = 'Hotel Les Filaos' and osm_id like 'ft/%'")" = "hotel Sainte-Marie Fort potentiel d'embauche (entretien des chambres, réception)" ] \
  || echec "fiche de l'hôtel : $($P -At -c "select nom, categorie, commune, offre_intitule from prospects where osm_id like 'ft/%filaos%'")"
[ "$($P -At -c "select categorie || ' ' || (recrute_le is null) from prospects where nom = 'Ti Kaz Bar' and osm_id like 'ft/%'")" = "bar true" ] \
  || echec "le bar (potentiel faible) ne doit pas être marqué : $($P -At -c "select nom, osm_id, categorie, recrute_le from prospects where nom ilike '%kaz%'")"
[ "$($P -At -c "select count(*) from prospects where recrute_le is not null")" = 2 ] || echec "seuls les établissements à fort potentiel sont marqués"
echo "OK  rapprochement, ajouts, catégories, fort potentiel seulement marqué"

echo "--- 2. Second relevé : rien en double, marque conservée"
bash "$RACINE/deploy/vps/offres-france-travail.sh" > /dev/null
[ "$($P -At -c "select count(*) from prospects where osm_id like 'ft/%'")" = 101 ] || echec "prospects en double"
[ "$($P -At -c "select ajoutes || ' ' || rapproches from releves_offres order by le desc limit 1")" = "0 102" ] || echec "second bilan"
[ "$($P -At -c "select count(*) from prospects where recrute_le is not null")" = 2 ] || echec "marques perdues ou ajoutées"
echo "OK  aucun doublon"

echo "--- 3. Prospection automatique : ceux qui recrutent passent en premier"
$P <<'SQL'
update prospects set email = 'contact-' || id || '@exemple.re' where osm_id like 'ft/%';
insert into prospects (osm_id, nom, categorie, commune, email, importe_le)
values ('node/1', 'Ancien Restaurant', 'restaurant', 'Saint-Paul', 'ancien@resto.re', now() - interval '1 year');
SQL
premier=$($P -At -c "select email from prospects_a_lancer('{ouest,nord,sud,est}') limit 1")
[ "$premier" != ancien@resto.re ] || echec "un établissement qui ne recrute pas passe en premier"
[ "$($P -At -c "select count(*) from (select email from prospects_a_lancer('{ouest,nord,sud,est}') limit 2) x
                 join prospects p on normaliser_email(p.email) = x.email where p.recrute_le is not null")" = 2 ] \
  || echec "les deux établissements à fort potentiel doivent passer en premier"
echo "OK  priorité à ceux qui recrutent"

echo "--- 4. Identifiants refusés : relevé noté en erreur"
printf 'FT_CLIENT_ID=id-essai\nFT_CLIENT_SECRET=mauvais\n' > "$DIR/.env"
if bash "$RACINE/deploy/vps/offres-france-travail.sh" > /dev/null 2>&1; then echec "relevé réussi avec de mauvais identifiants"; fi
$P -At -c "select erreur from releves_offres order by le desc limit 1" | grep -q "Identifiants refusés" || echec "erreur non notée"
echo "OK  erreur notée"
echo "La Bonne Boite : tout est conforme."
