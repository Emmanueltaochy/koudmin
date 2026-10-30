-- Espace prospection de l'équipe Kivien : établissements trouvés dans OpenStreetMap (ou ajoutés à
-- la main), suivi des contacts, campagnes d'e-mails envoyées par le VPS depuis bonjour@kivien.re.
--
-- Règles :
--   - chaque e-mail porte un lien de désinscription ; une adresse désinscrite n'est plus jamais écrite ;
--   - une même adresse ne reçoit pas deux campagnes à moins de 30 jours d'écart ;
--   - l'envoi est étalé par le VPS (plafond quotidien, deploy/vps/prospection.sh).
-- Tout passe par des fonctions réservées aux administrateurs : aucune table n'est lisible du site.

create table prospects (
  id uuid primary key default gen_random_uuid(),
  -- « node/123456 », « way/… » : identifiant OpenStreetMap, null pour un ajout à la main.
  osm_id text unique,
  nom text not null check (char_length(btrim(nom)) between 1 and 150),
  categorie text not null check (categorie in ('restaurant', 'bar', 'cafe', 'restauration_rapide', 'hotel', 'hebergement', 'nuit', 'autre')),
  commune text,
  adresse text,
  lat double precision,
  lng double precision,
  telephone text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  site text,
  statut text not null default 'a_contacter'
    check (statut in ('a_contacter', 'contacte', 'interesse', 'inscrit', 'pas_interesse')),
  notes text check (notes is null or char_length(notes) <= 1000),
  importe_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create table desinscriptions_prospection (
  email text primary key,
  le timestamptz not null default now()
);

create table campagnes (
  id uuid primary key default gen_random_uuid(),
  sujet text not null check (char_length(sujet) between 3 and 150),
  message text not null check (char_length(message) between 20 and 5000),
  cree_par uuid references auth.users (id) on delete set null,
  cree_le timestamptz not null default now()
);

create table envois_prospection (
  id uuid primary key default gen_random_uuid(),
  campagne_id uuid not null references campagnes (id) on delete cascade,
  prospect_id uuid references prospects (id) on delete set null,
  email text not null,
  -- Jeton du lien de désinscription (https://kivien.re/desinscription?j=…).
  jeton uuid not null unique default gen_random_uuid(),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'envoye', 'echoue', 'annule')),
  erreur text,
  envoye_le timestamptz,
  unique (campagne_id, email)
);
create index envois_a_faire on envois_prospection (statut) where statut = 'en_attente';
create index envois_par_email on envois_prospection (lower(email), envoye_le);

alter table prospects enable row level security;
alter table desinscriptions_prospection enable row level security;
alter table campagnes enable row level security;
alter table envois_prospection enable row level security;
revoke all on prospects, desinscriptions_prospection, campagnes, envois_prospection from anon, authenticated;

create function normaliser_email(p text) returns text
language sql immutable as $$ select nullif(lower(btrim(p)), '') $$;

-- Import d'OpenStreetMap : ajoute les nouveaux, met à jour nom, adresse et coordonnées des connus.
-- Un e-mail ou un téléphone saisi à la main n'est jamais effacé par un import sans ces données.
create function admin_importer_prospects(p_lignes jsonb)
returns table (ajoutes integer, mis_a_jour integer)
language plpgsql security definer set search_path = public as $$
declare a integer := 0; m integer := 0; l jsonb; nouveau boolean;
begin
  perform verifier_admin();
  if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Import invalide';
  end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    continue when coalesce(btrim(l->>'osm_id'), '') = '' or coalesce(btrim(l->>'nom'), '') = '';
    insert into prospects as p (osm_id, nom, categorie, commune, adresse, lat, lng, telephone, email, site)
    values (l->>'osm_id', left(btrim(l->>'nom'), 150),
            case when l->>'categorie' in ('restaurant', 'bar', 'cafe', 'restauration_rapide', 'hotel', 'hebergement', 'nuit')
                 then l->>'categorie' else 'autre' end,
            nullif(btrim(l->>'commune'), ''), nullif(btrim(l->>'adresse'), ''),
            (l->>'lat')::double precision, (l->>'lng')::double precision,
            nullif(btrim(l->>'telephone'), ''),
            case when normaliser_email(l->>'email') ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then normaliser_email(l->>'email') end,
            nullif(btrim(l->>'site'), ''))
    on conflict (osm_id) do update set
      nom = excluded.nom, categorie = excluded.categorie,
      commune = coalesce(excluded.commune, p.commune), adresse = coalesce(excluded.adresse, p.adresse),
      lat = excluded.lat, lng = excluded.lng,
      telephone = coalesce(p.telephone, excluded.telephone),
      email = coalesce(p.email, excluded.email),
      site = coalesce(p.site, excluded.site)
    returning (xmax = 0) into nouveau;
    if nouveau then a := a + 1; else m := m + 1; end if;
  end loop;
  return query select a, m;
end $$;

create function admin_prospects()
returns table (id uuid, nom text, categorie text, commune text, adresse text, lat double precision, lng double precision,
               telephone text, email text, site text, statut text, notes text, desinscrit boolean,
               dernier_envoi timestamptz, envois integer, importe_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select p.id, p.nom, p.categorie, p.commune, p.adresse, p.lat, p.lng, p.telephone, p.email, p.site, p.statut, p.notes,
           exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email)),
           (select max(e.envoye_le) from envois_prospection e where e.prospect_id = p.id),
           (select count(*)::integer from envois_prospection e where e.prospect_id = p.id and e.statut = 'envoye'),
           p.importe_le
    from prospects p
    order by p.nom;
end $$;

create function admin_modifier_prospect(p_id uuid, p_email text, p_telephone text, p_statut text, p_notes text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin();
  if normaliser_email(p_email) is not null and normaliser_email(p_email) !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then
    raise exception 'Adresse e-mail invalide';
  end if;
  update prospects set email = normaliser_email(p_email), telephone = nullif(btrim(p_telephone), ''),
         statut = p_statut, notes = nullif(btrim(p_notes), ''), maj_le = now()
   where id = p_id;
end $$;

-- Campagne : un envoi par adresse valide, ni désinscrite, ni écrite depuis moins de 30 jours.
create function admin_lancer_campagne(p_sujet text, p_message text, p_prospects uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare c uuid; n integer;
begin
  perform verifier_admin();
  insert into campagnes (sujet, message, cree_par) values (btrim(p_sujet), btrim(p_message), auth.uid()) returning id into c;
  insert into envois_prospection (campagne_id, prospect_id, email)
  select distinct on (normaliser_email(p.email)) c, p.id, normaliser_email(p.email)
  from prospects p
  where p.id = any (p_prospects)
    and normaliser_email(p.email) is not null
    and p.statut not in ('inscrit', 'pas_interesse')
    and not exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email))
    and not exists (select 1 from envois_prospection e where lower(e.email) = normaliser_email(p.email)
                    and (e.statut = 'en_attente' or e.envoye_le > now() - interval '30 days'))
  order by normaliser_email(p.email), p.nom;
  get diagnostics n = row_count;
  if n = 0 then
    delete from campagnes where id = c;
  end if;
  return n;
end $$;

create function admin_campagnes()
returns table (id uuid, sujet text, cree_le timestamptz, total integer, envoyes integer, en_attente integer, echecs integer, annules integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select c.id, c.sujet, c.cree_le, count(e.*)::integer,
           count(*) filter (where e.statut = 'envoye')::integer,
           count(*) filter (where e.statut = 'en_attente')::integer,
           count(*) filter (where e.statut = 'echoue')::integer,
           count(*) filter (where e.statut = 'annule')::integer
    from campagnes c left join envois_prospection e on e.campagne_id = c.id
    group by c.id
    order by c.cree_le desc;
end $$;

-- Lien de désinscription (page publique kivien.re/desinscription) : l'adresse n'est plus écrite.
create function se_desinscrire_prospection(p_jeton uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from envois_prospection where jeton = p_jeton;
  if v_email is null then return false; end if;
  insert into desinscriptions_prospection (email) values (normaliser_email(v_email)) on conflict do nothing;
  update envois_prospection set statut = 'annule' where lower(email) = normaliser_email(v_email) and statut = 'en_attente';
  update prospects set statut = 'pas_interesse', maj_le = now()
   where normaliser_email(email) = normaliser_email(v_email) and statut in ('a_contacter', 'contacte');
  return true;
end $$;

revoke execute on function admin_importer_prospects(jsonb), admin_prospects(), admin_modifier_prospect(uuid, text, text, text, text),
  admin_lancer_campagne(text, text, uuid[]), admin_campagnes(), se_desinscrire_prospection(uuid) from public;
grant execute on function admin_importer_prospects(jsonb), admin_prospects(), admin_modifier_prospect(uuid, text, text, text, text),
  admin_lancer_campagne(text, text, uuid[]), admin_campagnes() to authenticated;
grant execute on function se_desinscrire_prospection(uuid) to anon, authenticated;
