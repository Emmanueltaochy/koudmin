#!/usr/bin/env bash
# Sauvegarde quotidienne de la base Kivien (installée par installer.sh dans /usr/local/sbin).
# Format pg_dump « custom », relu après écriture, gardé 14 jours. Contient des données
# personnelles (dont numéros de sécurité sociale) : dossier et fichiers lisibles par root seul.
# À compléter : copie chiffrée hors du VPS (une sauvegarde sur la même machine ne protège pas d'une panne disque).
set -euo pipefail

DOSSIER=${KIVIEN_SAUVEGARDES:-/var/backups/kivien}
CONTENEUR=${KIVIEN_CONTENEUR_DB:-supabase-db}
umask 077
mkdir -p "$DOSSIER"
chmod 700 "$DOSSIER"

f="$DOSSIER/kivien-$(date -u +%Y%m%d-%H%M).dump"
ok=0
for role in postgres supabase_admin; do
  if docker exec "$CONTENEUR" pg_dump -h localhost -U "$role" -d postgres -Fc --no-owner > "$f.tmp" 2> "$f.err"; then
    ok=1
    break
  fi
done
if [ "$ok" -ne 1 ]; then
  echo "$(date -u +%FT%TZ) ÉCHEC pg_dump : $(tail -n 3 "$f.err")" >&2
  rm -f "$f.tmp"
  exit 1
fi
# La sauvegarde doit se relire, sinon elle ne vaut rien.
docker exec -i "$CONTENEUR" pg_restore -l < "$f.tmp" > /dev/null
mv "$f.tmp" "$f"
rm -f "$f.err"
find "$DOSSIER" -name 'kivien-*.dump' -mtime +14 -delete
echo "$(date -u +%FT%TZ) sauvegarde ok : $f ($(du -h "$f" | cut -f1))"
