#!/usr/bin/env bash
# Vérifie deploy/vps/notifications.sh sans boîte d'envoi : Postgres local jetable (comme
# verifier-sql.sh), messages écrits en fichiers .eml (KIVIEN_NOTIF_DOSSIER) puis relus.
# Usage : scripts/verifier-notifications.sh   (binaires PostgreSQL 16, python3)
set -euo pipefail
RACINE=$(cd "$(dirname "$0")/.." && pwd)
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d /var/tmp/kivien-notif.XXXX)
chmod 777 "$DIR"
PORT=5497
EN_PG() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
EN_PG "$BIN/initdb -D $DIR/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start >/dev/null"
trap 'EN_PG "$BIN/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -d k"
psql -h "$DIR" -p $PORT -U postgres -q -c "create database k"
$P -f "$RACINE/supabase/tests/stub-supabase.sql" 2>/dev/null
for f in "$RACINE"/supabase/migrations/*.sql; do $P -f "$f"; done
$P -c "grant select, insert, update, delete on all tables in schema public to authenticated"
$P -f "$RACINE/supabase/seed.sql"
# Les missions des données fictives ont déjà leurs alertes : seules celles du test comptent ici.
$P -c "delete from notifications_email"
mkdir "$DIR/mails"
export KIVIEN_PSQL="psql -h $DIR -p $PORT -U postgres -d k" KIVIEN_NOTIF_DOSSIER="$DIR/mails" KIVIEN_SUPABASE="$DIR"

echo "--- 1. Mission publiée près de Kévin (adresse confirmée, sans disponibilité indiquée) : alerte envoyée"
$P <<'SQL'
update auth.users set email = 'kevin@exemple.re', email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000e1';
delete from disponibilites;
insert into favoris values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000e1') on conflict do nothing;
insert into demandes (id, restaurant_id, poste, intitule, jour, debut, fin, adresse, commune, lat, lng)
values ('00000000-0000-0000-0000-00000000d0b1', '00000000-0000-0000-0000-00000000b001', 'autre', 'Aide au service du brunch',
        jour_reunion() + 3, 570, 870, '14 rue du Général de Gaulle', 'Saint-Gilles-les-Bains', -21.039442, 55.237476);
SQL
bash "$RACINE/deploy/vps/notifications.sh"
f=$(ls "$DIR"/mails/*-nouvelle_mission.eml)
python3 -I - "$f" <<'PY'
import sys
from email import policy
from email.parser import BytesParser
m = BytesParser(policy=policy.default).parse(open(sys.argv[1], "rb"))
texte = m.get_body(("plain",)).get_content()
assert m["To"] == "kevin@exemple.re", m["To"]
assert m["Subject"].startswith("Nouvelle mission près de chez toi : Aide au service du brunch, "), m["Subject"]
for attendu in ("Bonjour Kévin,", "Le Boucan Grillé cherche un extra à Saint-Gilles-les-Bains", "de 9 h 30 à 14 h 30",
                "C’est à 2 km de chez toi.", "https://app.kivien.re/mission/00000000-0000-0000-0000-00000000d0b1",
                "L'équipe Kivien", "SIRET 884 270 604 00025"):
    assert attendu in texte, (attendu, texte)
assert "!" not in texte
print("OK  alerte : " + m["Subject"])
PY
[ "$($P -At -c "select statut from notifications_email where demande_id = '00000000-0000-0000-0000-00000000d0b1' and destinataire = '00000000-0000-0000-0000-0000000000e1'")" = envoye ] \
  || { echo "ÉCHEC : alerte non notée comme envoyée" >&2; exit 1; }

echo "--- 2. Kévin accepte : l'établissement est prévenu ; il signe : Kévin est prévenu du contrat"
$P <<'SQL'
update auth.users set email = 'gerant@exemple.re', email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select accepter_mission('00000000-0000-0000-0000-00000000d0b1');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select signer_contrat((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d0b1'),
  'data:image/svg+xml,%3Csvg%3E%3Cpath d=%22M0 0L10 10%22/%3E%3C/svg%3E' || repeat('x', 200));
SQL
bash "$RACINE/deploy/vps/notifications.sh"
python3 -I - "$DIR"/mails/*-extra_trouve.eml "$DIR"/mails/*-contrat_a_signer.eml <<'PY'
import sys
from email import policy
from email.parser import BytesParser
lire = lambda f: BytesParser(policy=policy.default).parse(open(f, "rb"))
trouve, contrat = lire(sys.argv[1]), lire(sys.argv[2])
assert trouve["To"] == "gerant@exemple.re" and trouve["Subject"].startswith("Extra trouvé : Kévin, "), trouve["Subject"]
texte = trouve.get_body(("plain",)).get_content()
assert "Kévin a accepté votre mission Aide au service du brunch" in texte and "/contrat?affectation=" in texte, texte
assert contrat["To"] == "kevin@exemple.re" and contrat["Subject"].startswith("Ton contrat du "), contrat["Subject"]
assert "Le Boucan Grillé a signé ton contrat" in contrat.get_body(("plain",)).get_content()
print("OK  extra trouvé (établissement) et contrat à signer (extra)")
PY

echo "--- 3. Rien ne part deux fois ; une mission pourvue n'est plus annoncée"
avant=$(ls "$DIR"/mails | wc -l)
$P -c "insert into demandes (id, restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng)
       values ('00000000-0000-0000-0000-00000000d0b2', '00000000-0000-0000-0000-00000000b001', 'plonge', jour_reunion() + 5,
               1140, 1380, 'x', 'Saint-Paul', -21.04, 55.24)"
$P -c "update demandes set statut = 'pourvue' where id = '00000000-0000-0000-0000-00000000d0b2'"
bash "$RACINE/deploy/vps/notifications.sh"
[ "$(ls "$DIR"/mails | wc -l)" = "$avant" ] || { echo "ÉCHEC : message en trop" >&2; ls "$DIR"/mails >&2; exit 1; }
[ "$($P -At -c "select count(*) from notifications_email where statut = 'en_attente' and envoyer_apres <= now()")" = 0 ] \
  || { echo "ÉCHEC : file non vidée" >&2; exit 1; }
echo "Notifications conformes."
