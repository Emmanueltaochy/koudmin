#!/usr/bin/env bash
# Vérifie deploy/vps/dpae.sh sans l'Urssaf : Postgres local jetable (comme verifier-sql.sh) et faux
# service Urssaf local (KIVIEN_DPAE_URL) qui contrôle les fichiers reçus et répond comme le vrai.
# Usage : scripts/verifier-dpae.sh   (binaires PostgreSQL 16, python3)
set -euo pipefail
RACINE=$(cd "$(dirname "$0")/.." && pwd)
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d /var/tmp/kivien-dpae.XXXX)
chmod 777 "$DIR"
PORT=5496
PORT_URSSAF=5495
EN_PG() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
EN_PG "$BIN/initdb -D $DIR/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start >/dev/null"
trap 'kill $URSSAF 2>/dev/null || true; EN_PG "$BIN/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -d k"
psql -h "$DIR" -p $PORT -U postgres -q -c "create database k"
$P -f "$RACINE/supabase/tests/stub-supabase.sql" 2>/dev/null
for f in "$RACINE"/supabase/migrations/*.sql; do $P -f "$f"; done
$P -c "grant select, insert, update, delete on all tables in schema public to authenticated"
$P -f "$RACINE/supabase/seed.sql"
$P -c "delete from notifications_email"

# Faux service Urssaf : jeton, dépôt (fichier gardé pour contrôle, rejet si le salarié s'appelle REFUS),
# liste des retours et accusé de réception.
mkdir "$DIR/urssaf" "$DIR/mails"
cat > "$DIR/urssaf.py" <<'PY'
import gzip, http.server, json, os, sys, xml.dom.minidom
dossier, port = sys.argv[1], int(sys.argv[2])
depots = {}

class Urssaf(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def repondre(self, code, corps, type_="application/xml"):
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.end_headers()
        self.wfile.write(corps.encode("utf-8"))

    def do_POST(self):
        corps = self.rfile.read(int(self.headers["Content-Length"]))
        if self.path == "/authentifier_dpae":
            texte = corps.decode()
            bon = all(x in texte for x in ("<siret>88427060400025</siret>", "<nom>TAOCHY</nom>", "<prenom>Emmanuel</prenom>",
                                           "<motdepasse>secret-essai</motdepasse>", "<service>98</service>"))
            return self.repondre(200, "JETON-ESSAI", "application/octet-stream") if bon else self.repondre(401, "refus")
        if self.path == "/deposer-dsn/1.0/":
            assert self.headers["Authorization"] == "DSNLogin jeton=JETON-ESSAI", self.headers["Authorization"]
            assert self.headers["Content-Encoding"] == "gzip" and self.headers["Content-Type"] == "text/plain"
            xml_ = gzip.decompress(corps).decode("iso-8859-1")
            xml.dom.minidom.parseString(gzip.decompress(corps))  # bien formé
            n = len(os.listdir(dossier)) + 1
            open(os.path.join(dossier, f"depot-{n}.xml"), "w", encoding="utf-8").write(xml_)
            if ">REFUS<" in xml_:
                return self.repondre(422, "<avis><idflux>FLUX%d</idflux><motif>31 Le nom du salarié est invalide</motif></avis>" % n)
            depots[f"FLUX{n}"] = xml_
            return self.repondre(200, "<avis><envoi><idflux>FLUX%d</idflux></envoi></avis>" % n)
        self.repondre(404, "inconnu")

    def do_GET(self):
        assert self.headers["Authorization"] == "DSNLogin jeton=JETON-ESSAI"
        if self.path.startswith("/lister-retours-flux/2.0/"):
            flux = self.path.rsplit("/", 1)[1]
            retours = [{"nature": "10", "statut": "OK"}, {"nature": "11", "statut": "OK"},
                       {"nature": "20", "statut": "OK", "url": f"https://telechargement.dpae-edi.urssaf.fr/telecharger-retour/1.0/{flux}/20"}]
            return self.repondre(200, json.dumps({"retours": {"flux": [{"id": flux, "retour": retours}]}}), "application/json")
        if self.path.startswith("/telecharger-retour/1.0/"):
            flux = self.path.split("/")[3]
            return self.repondre(200, f"<AR><R_DOSSIER>DOSSIER-{flux}</R_DOSSIER><R_CODE>00</R_CODE></AR>")
        self.repondre(404, "inconnu")

http.server.HTTPServer(("127.0.0.1", port), Urssaf).serve_forever()
PY
python3 -I "$DIR/urssaf.py" "$DIR/urssaf" $PORT_URSSAF &
URSSAF=$!
for _ in $(seq 1 50); do
  python3 -I -c "import socket; socket.create_connection(('127.0.0.1', $PORT_URSSAF), 0.2)" 2>/dev/null && break
  sleep 0.1
done

cat > "$DIR/.env" <<'ENV'
DPAE_SIRET=88427060400025
DPAE_NOM=TAOCHY
DPAE_PRENOM=Emmanuel
DPAE_MOT_DE_PASSE=secret-essai
ENV
export KIVIEN_PSQL="psql -h $DIR -p $PORT -U postgres -d k" KIVIEN_SUPABASE="$DIR" \
  KIVIEN_DPAE_URL="http://127.0.0.1:$PORT_URSSAF" KIVIEN_NOTIF_DOSSIER="$DIR/mails"
echec() { echo "ÉCHEC : $*" >&2; exit 1; }
statut() { $P -At -c "select x.statut from dpae x join affectations a on a.id = x.affectation_id where a.demande_id = '$1'"; }
SIGNATURE="'data:image/svg+xml,%3Csvg%3E%3Cpath d=%22M0 0L10 10%22/%3E%3C/svg%3E' || repeat('x', 200)"
GERANT=00000000-0000-0000-0000-0000000000a1
KEVIN=00000000-0000-0000-0000-0000000000e1
RESTO=00000000-0000-0000-0000-00000000b001
mission() { # mission <id> <jours> : demande publiée, acceptée par Kévin
  $P > /dev/null <<SQL
insert into demandes (id, restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng)
values ('$1', '$RESTO', 'serveur', jour_reunion() + $2, 1140, 30, '14 rue du Général de Gaulle', 'Saint-Gilles-les-Bains', -21.039442, 55.237476);
set role authenticated;
set request.jwt.claim.sub = '$KEVIN';
select accepter_mission('$1');
SQL
}
signer() { # signer <id> <qui>
  $P > /dev/null <<SQL
set role authenticated;
set request.jwt.claim.sub = '$2';
select signer_contrat((select id from affectations where demande_id = '$1'), $SIGNATURE);
SQL
}

$P <<SQL
update auth.users set email = 'gerant@exemple.re', email_confirmed_at = now() where id = '$GERANT';
insert into responsables (utilisateur_id, prenom, nom) values ('$GERANT', 'Marie', 'Hoarau');
update restaurants set siret = '73282932000074' where id = '$RESTO';
insert into infos_contrat (extra_id, date_naissance, lieu_naissance, nir, adresse)
values ('$KEVIN', '1998-04-12', 'Saint-Paul', '198049741512345', '3 chemin des Flamboyants, 97460 Saint-Paul');
SQL

echo "--- 1. Envoi automatique fermé : pas de mandat possible, rien ne part"
if $P -c "set role authenticated; set request.jwt.claim.sub = '$GERANT'; select donner_mandat_dpae('$RESTO', '5610A', 'MT974')" 2>/dev/null; then
  echec "mandat accepté alors que la DPAE automatique est fermée"
fi
mission 00000000-0000-0000-0000-00000000da01 2
bash "$RACINE/deploy/vps/dpae.sh" | grep -q "Aucune DPAE" || echec "une DPAE est partie alors que l'envoi est fermé"
[ "$($P -At -c "select count(*) from dpae")" = 0 ] || echec "file non vide"
echo "OK  rien ne part"

echo "--- 2. Ouverture, mandat du gérant, contrat signé par l'extra : DPAE déposée puis acceptée"
$P -c "update reglages_dpae set actif = true"
$P -c "set role authenticated; set request.jwt.claim.sub = '$GERANT'; select donner_mandat_dpae('$RESTO', ' 56.10a ', 'mt974')" > /dev/null
[ "$($P -At -c "select code_ape || ' ' || service_sante from mandats_dpae")" = "5610A MT974" ] || echec "mandat mal enregistré"
bash "$RACINE/deploy/vps/dpae.sh" > /dev/null
[ "$($P -At -c "select count(*) from dpae")" = 0 ] || echec "une embauche d'avant le mandat a été prise"
mission 00000000-0000-0000-0000-00000000da02 3
bash "$RACINE/deploy/vps/dpae.sh" > /dev/null
[ "$(statut 00000000-0000-0000-0000-00000000da02)" = a_envoyer ] || echec "la DPAE devait attendre la signature de l'extra"
signer 00000000-0000-0000-0000-00000000da02 $GERANT
signer 00000000-0000-0000-0000-00000000da02 $KEVIN
bash "$RACINE/deploy/vps/dpae.sh"
[ "$(statut 00000000-0000-0000-0000-00000000da02)" = acceptee ] || echec "DPAE non acceptée : $(statut 00000000-0000-0000-0000-00000000da02)"
[ "$($P -At -c "select reference from dpae where statut = 'acceptee'")" = DOSSIER-FLUX1 ] || echec "référence du dossier absente"
JOUR=$($P -At -c "select jour_reunion() + 3") LENDEMAIN=$($P -At -c "select jour_reunion() + 4") python3 -I - "$DIR/urssaf/depot-1.xml" <<'PY'
import os, sys
x = open(sys.argv[1], encoding="utf-8").read()
for attendu in (
    '<?xml version="1.0" encoding="ISO-8859-1" ?>',
    "<FR_DUE_Upload.Test.Indicator>120</FR_DUE_Upload.Test.Indicator>",
    "<rxorg:FR_Organization.SIRET.Identifier>73282932000074</rxorg:FR_Organization.SIRET.Identifier>",
    "<rxorg:FR_Organization.Designation.Text>Le Boucan Grillé</rxorg:FR_Organization.Designation.Text>",
    "<rxorg:FR_Organization.APE.Code>5610A</rxorg:FR_Organization.APE.Code>",
    "<FR_Employer.URSSAF.Code>974</FR_Employer.URSSAF.Code>",
    "<rxpadr:FR_PostalAddress.StreetDesignation.Text>14 rue du Général de Gaulle</rxpadr:FR_PostalAddress.StreetDesignation.Text>",
    "<rxpadr:FR_PostalAddress.Postal.Code>97434</rxpadr:FR_PostalAddress.Postal.Code>",
    "<rxphadr:FR_PhoneAddress.PhoneNumber.Text>0262000001</rxphadr:FR_PhoneAddress.PhoneNumber.Text>",
    "<rxpers:FR_PersonIdentity.Surname.Text>HOARAU</rxpers:FR_PersonIdentity.Surname.Text>",
    "<rxpers:FR_PersonIdentity.ChristianName.Text>KEVIN</rxpers:FR_PersonIdentity.ChristianName.Text>",
    "<rxpers:FR_PersonIdentity.Sex.Code>1</rxpers:FR_PersonIdentity.Sex.Code>",
    "<rxpers:FR_NNI.NIR.Identifier>1980497415123</rxpers:FR_NNI.NIR.Identifier>",
    "<rxpers:FR_NNI.NIRKey.Text>45</rxpers:FR_NNI.NIRKey.Text>",
    "<rxpers:FR_Birth.Date>1998-04-12</rxpers:FR_Birth.Date>",
    "<rxpers:FR_Birth.Town.Text>SAINT-PAUL</rxpers:FR_Birth.Town.Text>",
    "<FR_EmployeeComplement.Birth_Department.Code>974</FR_EmployeeComplement.Birth_Department.Code>",
    f"<FR_Contract.StartContract.Date>{os.environ['JOUR']}</FR_Contract.StartContract.Date>",
    "<FR_Contract.StartContract.Time>19:00:00</FR_Contract.StartContract.Time>",
    # Fin à 0 h 30 : le contrat se termine le lendemain.
    f"<FR_Contract.EndContract.Date>{os.environ['LENDEMAIN']}</FR_Contract.EndContract.Date>",
    "<FR_Contract.Nature.Code>CDD</FR_Contract.Nature.Code>",
    "<FR_Contract.HealthService.Text>MT974</FR_Contract.HealthService.Text>",
):
    assert attendu in x, (attendu, x)
print("OK  fichier DPAE conforme, accusé de réception enregistré")
PY

echo "--- 3. Rien ne part deux fois"
bash "$RACINE/deploy/vps/dpae.sh" | grep -q "Aucune DPAE" || echec "nouvel envoi inattendu"
[ "$(ls "$DIR/urssaf" | wc -l)" = 1 ] || echec "dépôt en double"
echo "OK  un seul dépôt"

echo "--- 4. Extra sans numéro de sécurité sociale : l'établissement est prévenu par e-mail"
$P -c "update infos_contrat set nir = null"
mission 00000000-0000-0000-0000-00000000da03 4
bash "$RACINE/deploy/vps/dpae.sh" > /dev/null
[ "$(statut 00000000-0000-0000-0000-00000000da03)" = a_faire ] || echec "statut attendu a_faire : $(statut 00000000-0000-0000-0000-00000000da03)"
$P -At -c "select motif from dpae where statut = 'a_faire'" | grep -q "numéro de sécurité sociale" || echec "motif absent"
$P -c "delete from notifications_email where type <> 'dpae_a_faire'"
bash "$RACINE/deploy/vps/notifications.sh" > /dev/null
python3 -I - "$DIR"/mails/*-dpae_a_faire.eml <<'PY'
import sys
from email import policy
from email.parser import BytesParser
m = BytesParser(policy=policy.default).parse(open(sys.argv[1], "rb"))
texte = m.get_body(("plain",)).get_content()
assert m["To"] == "gerant@exemple.re" and m["Subject"].startswith("DPAE à faire vous-même : Kévin, "), m["Subject"]
assert texte.startswith("Bonjour Marie,") and "n’a pas pu être envoyée automatiquement" in texte, texte
assert "/contrat?affectation=" in texte and "!" not in texte, texte
print("OK  " + m["Subject"])
PY

echo "--- 5. Fichier rejeté par l'Urssaf : DPAE refusée, motif gardé, établissement prévenu"
$P -c "update infos_contrat set nir = '198049741512345'; update extras set nom = 'Refus' where id = '$KEVIN'"
mission 00000000-0000-0000-0000-00000000da04 5
signer 00000000-0000-0000-0000-00000000da04 $GERANT
signer 00000000-0000-0000-0000-00000000da04 $KEVIN
bash "$RACINE/deploy/vps/dpae.sh" > /dev/null
[ "$(statut 00000000-0000-0000-0000-00000000da04)" = refusee ] || echec "statut attendu refusee : $(statut 00000000-0000-0000-0000-00000000da04)"
$P -At -c "select motif from dpae where statut = 'refusee'" | grep -q "Le nom du salarié est invalide" || echec "motif du rejet absent"
[ "$($P -At -c "select count(*) from notifications_email where type = 'dpae_a_faire' and statut = 'en_attente'")" = 1 ] || echec "établissement non prévenu du rejet"
echo "OK  rejet noté"

echo "--- 6. Désistement après l'envoi : DPAE à annuler ; mandat retiré : plus rien ne part"
$P -c "set role authenticated; set request.jwt.claim.sub = '$KEVIN'; select se_desister('00000000-0000-0000-0000-00000000da02')" > /dev/null
bash "$RACINE/deploy/vps/dpae.sh" > /dev/null
[ "$(statut 00000000-0000-0000-0000-00000000da02)" = a_annuler ] || echec "statut attendu a_annuler : $(statut 00000000-0000-0000-0000-00000000da02)"
$P -c "update extras set nom = 'Hoarau' where id = '$KEVIN'"
$P -c "set role authenticated; set request.jwt.claim.sub = '$GERANT'; select retirer_mandat_dpae('$RESTO')" > /dev/null
mission 00000000-0000-0000-0000-00000000da05 6
bash "$RACINE/deploy/vps/dpae.sh" > /dev/null
[ -z "$(statut 00000000-0000-0000-0000-00000000da05)" ] || echec "DPAE créée sans mandat"
echo "OK  désistement et retrait du mandat"

echo "--- 7. Droits : un extra ne lit ni les DPAE ni les mandats, et ne peut pas appeler le serveur"
[ "$($P -At -c "set role authenticated; set request.jwt.claim.sub = '$KEVIN'; select count(*) from dpae")" = 0 ] || echec "un extra lit les DPAE"
[ "$($P -At -c "set role authenticated; set request.jwt.claim.sub = '$GERANT'; select count(*) from dpae")" -ge 3 ] || echec "le gérant ne lit pas ses DPAE"
if $P -c "set role authenticated; set request.jwt.claim.sub = '$KEVIN'; select * from prendre_dpae(5)" 2>/dev/null; then
  echec "prendre_dpae accessible à un compte"
fi
echo "OK  droits"
echo "DPAE automatique : tout est conforme."
