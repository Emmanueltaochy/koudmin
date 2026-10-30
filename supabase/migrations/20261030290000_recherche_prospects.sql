-- Recherche des établissements faite par le VPS (deploy/vps/recherche-prospects.sh), plus par le
-- navigateur : une recherche sur toute l'île peut prendre plusieurs minutes. Le bouton de l'espace
-- admin dépose une demande ; le VPS la prend dans la minute et note ici son bilan ou son erreur.

create table recherches_prospects (
  id uuid primary key default gen_random_uuid(),
  demandee_le timestamptz not null default now(),
  demandee_par uuid references auth.users (id) on delete set null,
  debut_le timestamptz,
  fin_le timestamptz,
  statut text not null default 'demandee' check (statut in ('demandee', 'en_cours', 'terminee', 'echouee')),
  trouves integer,
  ajoutes integer,
  mis_a_jour integer,
  emails_trouves integer,
  erreur text
);
alter table recherches_prospects enable row level security;
revoke all on recherches_prospects from anon, authenticated;

-- D'où vient l'e-mail : OpenStreetMap, site web de l'établissement, saisie à la main.
alter table prospects
  add column source_email text check (source_email in ('osm', 'site', 'manuel')),
  add column site_lu_le timestamptz;
update prospects set source_email = 'osm' where email is not null;

-- Import sans contrôle d'administrateur : réservé au VPS (superutilisateur), jamais exposé.
create function importer_prospects(p_lignes jsonb)
returns table (ajoutes integer, mis_a_jour integer)
language plpgsql security definer set search_path = public as $$
declare a integer := 0; m integer := 0; l jsonb; nouveau boolean; courriel text;
begin
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Import invalide';
  end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    continue when coalesce(btrim(l->>'osm_id'), '') = '' or coalesce(btrim(l->>'nom'), '') = '';
    courriel := case when normaliser_email(l->>'email') ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then normaliser_email(l->>'email') end;
    insert into prospects as p (osm_id, nom, categorie, commune, adresse, lat, lng, telephone, email, source_email, site)
    values (l->>'osm_id', left(btrim(l->>'nom'), 150),
            case when l->>'categorie' in ('restaurant', 'bar', 'cafe', 'restauration_rapide', 'hotel', 'hebergement', 'nuit')
                 then l->>'categorie' else 'autre' end,
            nullif(btrim(l->>'commune'), ''), nullif(btrim(l->>'adresse'), ''),
            (l->>'lat')::double precision, (l->>'lng')::double precision,
            nullif(btrim(l->>'telephone'), ''), courriel, case when courriel is not null then 'osm' end,
            nullif(btrim(l->>'site'), ''))
    on conflict (osm_id) do update set
      nom = excluded.nom, categorie = excluded.categorie,
      commune = coalesce(excluded.commune, p.commune), adresse = coalesce(excluded.adresse, p.adresse),
      lat = excluded.lat, lng = excluded.lng,
      -- Ce qui a été saisi ou trouvé n'est jamais effacé par un import qui ne l'a pas.
      telephone = coalesce(p.telephone, excluded.telephone),
      source_email = case when p.email is null and excluded.email is not null then 'osm' else p.source_email end,
      email = coalesce(p.email, excluded.email),
      site = coalesce(p.site, excluded.site)
    returning (xmax = 0) into nouveau;
    if nouveau then a := a + 1; else m := m + 1; end if;
  end loop;
  return query select a, m;
end $$;
revoke execute on function importer_prospects(jsonb) from public, anon, authenticated;

-- L'import depuis le navigateur reste possible (démonstration, fichier) : même règles.
create or replace function admin_importer_prospects(p_lignes jsonb)
returns table (ajoutes integer, mis_a_jour integer)
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query select * from importer_prospects(p_lignes);
end $$;

-- Saisie à la main : notée comme telle.
create or replace function admin_modifier_prospect(p_id uuid, p_email text, p_telephone text, p_statut text, p_notes text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin();
  if normaliser_email(p_email) is not null and normaliser_email(p_email) !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  update prospects set
    source_email = case when normaliser_email(p_email) is distinct from email
                        then case when normaliser_email(p_email) is null then null else 'manuel' end
                        else source_email end,
    email = normaliser_email(p_email), telephone = nullif(btrim(p_telephone), ''),
    statut = p_statut, notes = nullif(btrim(p_notes), ''), maj_le = now()
   where id = p_id;
end $$;

-- Bouton « Chercher » : une seule demande à la fois (une recherche bloquée depuis 30 min ne compte plus).
create function admin_demander_recherche()
returns uuid
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  perform verifier_admin();
  select id into r from recherches_prospects
   where statut = 'demandee' or (statut = 'en_cours' and debut_le > now() - interval '30 minutes')
   order by demandee_le desc limit 1;
  if r is null then
    insert into recherches_prospects (demandee_par) values (auth.uid()) returning id into r;
  end if;
  return r;
end $$;

create function admin_derniere_recherche()
returns table (id uuid, statut text, demandee_le timestamptz, debut_le timestamptz, fin_le timestamptz,
               trouves integer, ajoutes integer, mis_a_jour integer, emails_trouves integer, erreur text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select r.id, r.statut, r.demandee_le, r.debut_le, r.fin_le, r.trouves, r.ajoutes, r.mis_a_jour, r.emails_trouves, r.erreur
    from recherches_prospects r order by r.demandee_le desc limit 1;
end $$;

-- admin_prospects avec l'origine de l'e-mail.
drop function admin_prospects();
create function admin_prospects()
returns table (id uuid, nom text, categorie text, commune text, adresse text, lat double precision, lng double precision,
               telephone text, email text, source_email text, site text, statut text, notes text, desinscrit boolean,
               dernier_envoi timestamptz, envois integer, importe_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select p.id, p.nom, p.categorie, p.commune, p.adresse, p.lat, p.lng, p.telephone, p.email, p.source_email, p.site,
           p.statut, p.notes,
           exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email)),
           (select max(e.envoye_le) from envois_prospection e where e.prospect_id = p.id),
           (select count(*)::integer from envois_prospection e where e.prospect_id = p.id and e.statut = 'envoye'),
           p.importe_le
    from prospects p
    order by p.nom;
end $$;

revoke execute on function admin_demander_recherche(), admin_derniere_recherche(), admin_prospects() from public, anon;
grant execute on function admin_demander_recherche(), admin_derniere_recherche(), admin_prospects() to authenticated;
