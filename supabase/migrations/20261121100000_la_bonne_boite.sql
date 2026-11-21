-- Source des établissements qui vont recruter : API La Bonne Boite v2 (France Travail), l'API de
-- recherche d'offres d'emploi n'étant plus proposée. Une entreprise sans « fort potentiel » arrive
-- sans date (publiee_le absent) : elle rejoint la prospection sans être marquée « recrute ».

create or replace function importer_offres(p_lignes jsonb) returns table (ajoutes integer, rapproches integer)
language plpgsql security definer set search_path = public as $$
declare
  a integer := 0; r integer := 0; l jsonb; cible uuid; courriel text; cle text; publiee timestamptz;
begin
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) > 5000 then
    raise exception 'Import invalide';
  end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    continue when coalesce(btrim(l->>'nom'), '') = '';
    courriel := case when normaliser_email(l->>'email') ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then normaliser_email(l->>'email') end;
    publiee := nullif(l->>'publiee_le', '')::timestamptz;
    cle := 'ft/' || nom_comparable(l->>'nom') || '/' || nom_comparable(l->>'commune');
    select p.id into cible from prospects p
     where p.osm_id = cle
        or (nom_comparable(p.nom) = nom_comparable(l->>'nom')
            and (nom_comparable(p.commune) = nom_comparable(l->>'commune') or p.commune is null))
     order by (p.osm_id = cle) desc, p.importe_le
     limit 1;
    if cible is null then
      insert into prospects (osm_id, nom, categorie, commune, lat, lng, telephone, email, source_email, site,
                             recrute_le, offre_intitule, offre_url)
      values (cle, left(btrim(l->>'nom'), 150),
              case when l->>'categorie' in ('restaurant', 'bar', 'cafe', 'restauration_rapide', 'hotel', 'hebergement', 'nuit')
                   then l->>'categorie' else 'autre' end,
              nullif(btrim(l->>'commune'), ''), (l->>'lat')::double precision, (l->>'lng')::double precision,
              nullif(btrim(l->>'telephone'), ''), courriel, case when courriel is not null then 'offre' end,
              case when l->>'site' ~ '^https?://' then left(l->>'site', 300) end,
              publiee, case when publiee is not null then left(l->>'intitule', 200) end,
              case when publiee is not null and l->>'url' ~ '^https://' then left(l->>'url', 500) end);
      a := a + 1;
    else
      update prospects p set
        recrute_le = case when publiee is null then p.recrute_le else greatest(coalesce(p.recrute_le, publiee), publiee) end,
        offre_intitule = case when publiee is not null and (p.recrute_le is null or publiee >= p.recrute_le)
                              then left(l->>'intitule', 200) else p.offre_intitule end,
        offre_url = case when publiee is not null and (p.recrute_le is null or publiee >= p.recrute_le)
                         then case when l->>'url' ~ '^https://' then left(l->>'url', 500) end else p.offre_url end,
        telephone = coalesce(p.telephone, nullif(btrim(l->>'telephone'), '')),
        source_email = case when p.email is null and courriel is not null then 'offre' else p.source_email end,
        email = coalesce(p.email, courriel),
        lat = coalesce(p.lat, (l->>'lat')::double precision),
        lng = coalesce(p.lng, (l->>'lng')::double precision),
        maj_le = now()
      where p.id = cible;
      r := r + 1;
    end if;
  end loop;
  return query select a, r;
end $$;
revoke execute on function importer_offres(jsonb) from public, anon, authenticated;
