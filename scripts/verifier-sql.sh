#!/usr/bin/env bash
# Vérifie la migration et les données fictives sur un Postgres local jetable, sans Docker.
# Un schéma `auth` minimal imite Supabase (supabase/tests/stub-supabase.sql).
# Usage : scripts/verifier-sql.sh   (nécessite les binaires PostgreSQL 16)
set -euo pipefail
RACINE=$(cd "$(dirname "$0")/.." && pwd)
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d /var/tmp/kivien-pg.XXXX)
chmod 777 "$DIR"
PORT=5499
EN_PG() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
EN_PG "$BIN/initdb -D $DIR/data -A trust >/dev/null && $BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start >/dev/null"
trap 'EN_PG "$BIN/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database k"
$P -d k -f "$RACINE/supabase/tests/stub-supabase.sql" 2>/dev/null
for f in "$RACINE"/supabase/migrations/*.sql; do $P -d k -f "$f"; done
$P -d k -c "grant select, insert, update, delete on all tables in schema public to authenticated"
$P -d k -f "$RACINE/supabase/seed.sql"
psql -h "$DIR" -p $PORT -U postgres -d k -f "$RACINE/supabase/tests/scenario.sql" > "$DIR/scenario.log" 2>&1 || true
cat "$DIR/scenario.log"

# Le scénario provoque exactement ces refus ; toute autre erreur (ou un refus manquant) fait échouer.
attendues='Informations du contrat manquantes
Mission pas encore commencée
Taux horaire sous le minimum légal
new row violates row-level security policy for table "extras"'
obtenues=$(grep -oP 'ERROR:  \K.*' "$DIR/scenario.log" | LC_ALL=C sort)
if [ "$obtenues" != "$(LC_ALL=C sort <<<"$attendues")" ]; then
  echo "ÉCHEC : erreurs SQL inattendues" >&2
  diff <(LC_ALL=C sort <<<"$attendues") <(echo "$obtenues") >&2 || true
  exit 1
fi
echo "Scénario SQL conforme (4 refus attendus)."
