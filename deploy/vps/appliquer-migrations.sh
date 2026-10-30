#!/usr/bin/env bash
# Applique supabase/migrations/*.sql à la base du VPS, dans l'ordre, une seule fois chacune.
# Chaque fichier est appliqué dans une transaction ; son empreinte est enregistrée.
# Une migration déjà appliquée puis modifiée bloque tout : on ne réécrit jamais l'historique.
#
# Usage : sudo deploy/vps/appliquer-migrations.sh <dossier des migrations>
set -euo pipefail

DOSSIER=${1:?Dossier des migrations attendu}
CONTENEUR=${KIVIEN_CONTENEUR_DB:-supabase-db}
psql_db() { docker exec -i "$CONTENEUR" psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Suivi des migrations, hors du schéma public (non exposé par l'API).
psql_db <<'SQL'
set client_min_messages = warning;
create schema if not exists kivien_admin;
revoke all on schema kivien_admin from public;
create table if not exists kivien_admin.migrations (
  nom text primary key,
  empreinte text not null,
  appliquee_le timestamptz not null default now()
);
-- La publication du temps réel est normalement créée par l'image Supabase.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
SQL

shopt -s nullglob
fichiers=("$DOSSIER"/*.sql)
if [ ${#fichiers[@]} -eq 0 ]; then
  echo "Aucune migration dans $DOSSIER" >&2
  exit 1
fi

for f in "${fichiers[@]}"; do
  nom=$(basename "$f")
  empreinte=$(sha256sum "$f" | cut -d' ' -f1)
  deja=$(psql_db -At -v nom="$nom" <<<"select empreinte from kivien_admin.migrations where nom = :'nom';")
  if [ -n "$deja" ]; then
    if [ "$deja" != "$empreinte" ]; then
      echo "ERREUR : $nom a changé depuis son application. Écrire une nouvelle migration." >&2
      exit 1
    fi
    echo "  déjà appliquée : $nom"
    continue
  fi
  echo "  application : $nom"
  { cat "$f"; printf "\ninsert into kivien_admin.migrations (nom, empreinte) values ('%s', '%s');\n" "$nom" "$empreinte"; } \
    | psql_db --single-transaction
done

# Paramètres tarifaires initiaux (SMIC 2026, frais 19 € HT, TVA 8,5 %), seulement si la table est vide.
psql_db <<'SQL'
insert into parametres (date_effet, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes, tva_pour_mille)
select '2026-01-01', 1231, 1900, 85
where not exists (select 1 from parametres);
SQL
echo "Migrations à jour."
