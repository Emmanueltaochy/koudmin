-- Prospects qui recrutent en ce moment : offres d'emploi de La Réunion publiées sur France Travail
-- (hôtellerie, restauration), relevées chaque jour par le VPS (deploy/vps/offres-france-travail.sh).
-- L'établissement de l'offre est rapproché d'un prospect existant (même nom, même commune), ou ajouté.
-- Ces établissements passent en premier dans la prospection automatique.

alter table prospects
  add column recrute_le timestamptz,
  add column offre_intitule text check (offre_intitule is null or char_length(offre_intitule) <= 200),
  add column offre_url text check (offre_url is null or offre_url ~ '^https://');

-- Nom comparable : minuscules, sans accents ni ponctuation.
create function nom_comparable(p text) returns text
language sql immutable as $$
  select btrim(regexp_replace(lower(translate(coalesce(p, ''),
    'ÀÂÄÁÃÉÈÊËÎÏÍÌÔÖÓÒÕÙÛÜÚÇàâäáãéèêëîïíìôöóòõùûüúç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc')),
    '[^a-z0-9]+', ' ', 'g'))
$$;

create function importer_offres(p_lignes jsonb) returns table (ajoutes integer, rapproches integer)
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
    publiee := coalesce((l->>'publiee_le')::timestamptz, now());
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
              publiee, left(l->>'intitule', 200), case when l->>'url' ~ '^https://' then left(l->>'url', 500) end);
      a := a + 1;
    else
      update prospects p set
        recrute_le = greatest(coalesce(p.recrute_le, publiee), publiee),
        offre_intitule = case when p.recrute_le is null or publiee >= p.recrute_le then left(l->>'intitule', 200) else p.offre_intitule end,
        offre_url = case when (p.recrute_le is null or publiee >= p.recrute_le) and l->>'url' ~ '^https://'
                         then left(l->>'url', 500) else p.offre_url end,
        -- Ce qui a été saisi ou trouvé n'est jamais effacé.
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

alter table prospects drop constraint if exists prospects_source_email_check;
alter table prospects add constraint prospects_source_email_check
  check (source_email is null or source_email in ('osm', 'site', 'manuel', 'offre'));

-- Prospection automatique : ceux qui recrutent (offre de moins de 30 jours) d'abord, les plus récents en tête.
create or replace function prospects_a_lancer(p_zones text[])
returns table (prospect_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select x.id, x.courriel from (
    select distinct on (normaliser_email(p.email)) p.id, normaliser_email(p.email) as courriel, p.recrute_le, p.importe_le
    from prospects p
    where normaliser_email(p.email) is not null
      and p.statut = 'a_contacter'
      and zone_du_lieu(p.commune, p.lat, p.lng) = any (p_zones)
      and not exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email))
      and not exists (select 1 from envois_prospection e where lower(e.email) = normaliser_email(p.email))
    order by normaliser_email(p.email), p.recrute_le desc nulls last, p.importe_le, p.id
  ) x
  order by (x.recrute_le > now() - interval '30 days') desc nulls last, x.recrute_le desc nulls last, x.importe_le, x.id
$$;

drop function admin_prospects();
create function admin_prospects()
returns table (id uuid, nom text, categorie text, commune text, adresse text, lat double precision, lng double precision,
               telephone text, email text, source_email text, site text, statut text, notes text, desinscrit boolean,
               dernier_envoi timestamptz, envois integer, importe_le timestamptz,
               recrute_le timestamptz, offre_intitule text, offre_url text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select p.id, p.nom, p.categorie, p.commune, p.adresse, p.lat, p.lng, p.telephone, p.email, p.source_email, p.site,
           p.statut, p.notes,
           exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email)),
           (select max(e.envoye_le) from envois_prospection e where e.prospect_id = p.id),
           (select count(*)::integer from envois_prospection e where e.prospect_id = p.id and e.statut = 'envoye'),
           p.importe_le, p.recrute_le, p.offre_intitule, p.offre_url
    from prospects p
    order by p.nom, p.id;
end $$;
revoke execute on function admin_prospects() from public, anon;
grant execute on function admin_prospects() to authenticated;

-- Dernier relevé des offres, pour l'admin et le bilan de déploiement.
create table releves_offres (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  offres integer not null default 0,
  ajoutes integer not null default 0,
  rapproches integer not null default 0,
  erreur text
);
alter table releves_offres enable row level security;
revoke all on releves_offres from public, anon, authenticated;

create function admin_dernier_releve_offres()
returns table (le timestamptz, offres integer, ajoutes integer, rapproches integer, erreur text, recrutent integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select r.le, r.offres, r.ajoutes, r.rapproches, r.erreur,
           (select count(*)::integer from prospects p where p.recrute_le > now() - interval '30 days')
    from (select 1) un
    left join lateral (select * from releves_offres x order by x.le desc limit 1) r on true;
end $$;
revoke execute on function admin_dernier_releve_offres() from public, anon;
grant execute on function admin_dernier_releve_offres() to authenticated;
