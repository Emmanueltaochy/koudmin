-- Prospection automatique, désactivée par défaut (espace admin, onglet Prospection). Une fois
-- activée, chaque jour de semaine (deploy/vps/prospection.sh), dans la limite du plafond quotidien :
--   1. premier e-mail aux établissements des zones choisies jamais contactés ;
--   2. une seule relance, N jours après, à ceux qui n'ont pas cliqué.
-- Jamais pour une adresse désinscrite, un établissement inscrit ou « pas intéressé ».

-- Communes de La Réunion et leur zone (même découpage que packages/core/src/zones.ts, vérifié par test).
create table communes_zones (
  commune text primary key,
  zone text not null check (zone in ('nord', 'ouest', 'sud', 'est')),
  lat double precision not null,
  lng double precision not null
);
insert into communes_zones (commune, zone, lat, lng) values
  ('Bras-Panon', 'est', -21.0017, 55.6775),
  ('Cilaos', 'sud', -21.1342, 55.4719),
  ('L''Entre-Deux', 'sud', -21.2489, 55.4717),
  ('L''Étang-Salé', 'sud', -21.265, 55.3667),
  ('La Plaine-des-Palmistes', 'est', -21.1336, 55.6283),
  ('La Possession', 'ouest', -20.925, 55.3358),
  ('Le Port', 'ouest', -20.9372, 55.2919),
  ('Le Tampon', 'sud', -21.2781, 55.5153),
  ('Les Avirons', 'sud', -21.2408, 55.3394),
  ('Les Trois-Bassins', 'ouest', -21.1031, 55.2961),
  ('Petite-Île', 'sud', -21.3531, 55.5636),
  ('Saint-André', 'est', -20.9631, 55.6503),
  ('Saint-Benoît', 'est', -21.0339, 55.7128),
  ('Saint-Denis', 'nord', -20.8823, 55.4504),
  ('Saint-Joseph', 'sud', -21.3778, 55.6194),
  ('Saint-Leu', 'ouest', -21.1706, 55.2886),
  ('Saint-Louis', 'sud', -21.2861, 55.4114),
  ('Saint-Paul', 'ouest', -21.0096, 55.2707),
  ('Saint-Philippe', 'sud', -21.3586, 55.7672),
  ('Saint-Pierre', 'sud', -21.3393, 55.4781),
  ('Sainte-Marie', 'nord', -20.8969, 55.5492),
  ('Sainte-Rose', 'est', -21.1275, 55.7958),
  ('Sainte-Suzanne', 'nord', -20.9067, 55.6067),
  ('Salazie', 'est', -21.0275, 55.5394)
;
alter table communes_zones enable row level security;
revoke all on communes_zones from anon, authenticated;

-- Zone d'un lieu : par le nom de sa commune, sinon par la commune la plus proche.
create function zone_du_lieu(p_commune text, p_lat double precision, p_lng double precision) returns text
language sql stable set search_path = public as $$
  select coalesce(
    (select zone from communes_zones where commune = p_commune),
    (select zone from communes_zones where p_lat is not null and p_lng is not null
      order by (lat - p_lat) ^ 2 + (lng - p_lng) ^ 2 limit 1)
  )
$$;

alter table campagnes add column automatique text check (automatique in ('lancement', 'relance'));

create table reglages_prospection (
  id smallint primary key default 1 check (id = 1),
  actif boolean not null default false,
  zones text[] not null default '{ouest}' check (zones <@ array['nord', 'ouest', 'sud', 'est'] and cardinality(zones) > 0),
  sujet text check (sujet is null or char_length(sujet) between 3 and 150),
  message text check (message is null or char_length(message) between 20 and 5000),
  relance boolean not null default true,
  relance_jours integer not null default 10 check (relance_jours between 3 and 60),
  relance_sujet text check (relance_sujet is null or char_length(relance_sujet) between 3 and 150),
  relance_message text check (relance_message is null or char_length(relance_message) between 20 and 5000),
  maj_le timestamptz not null default now(),
  check (not actif or (sujet is not null and message is not null)),
  check (not (actif and relance) or (relance_sujet is not null and relance_message is not null))
);
insert into reglages_prospection default values;
alter table reglages_prospection enable row level security;
revoke all on reglages_prospection from anon, authenticated;

-- Établissements à écrire pour la première fois, dans les zones choisies.
create function prospects_a_lancer(p_zones text[])
returns table (prospect_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select distinct on (normaliser_email(p.email)) p.id, normaliser_email(p.email)
  from prospects p
  where normaliser_email(p.email) is not null
    and p.statut = 'a_contacter'
    and zone_du_lieu(p.commune, p.lat, p.lng) = any (p_zones)
    and not exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email))
    and not exists (select 1 from envois_prospection e where lower(e.email) = normaliser_email(p.email))
  order by normaliser_email(p.email), p.importe_le, p.id
$$;

-- Établissements à relancer : un premier e-mail envoyé il y a au moins p_jours, aucun clic,
-- aucune relance déjà faite.
create function prospects_a_relancer(p_zones text[], p_jours integer)
returns table (prospect_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select distinct on (normaliser_email(p.email)) p.id, normaliser_email(p.email)
  from prospects p
  where normaliser_email(p.email) is not null
    and p.statut in ('a_contacter', 'contacte')
    and zone_du_lieu(p.commune, p.lat, p.lng) = any (p_zones)
    and not exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email))
    and exists (select 1 from envois_prospection e where lower(e.email) = normaliser_email(p.email)
                and e.statut = 'envoye' and e.envoye_le <= now() - make_interval(days => p_jours))
    and not exists (select 1 from envois_prospection e where lower(e.email) = normaliser_email(p.email)
                    and (e.statut = 'en_attente' or e.envoye_le > now() - make_interval(days => p_jours)))
    and not exists (select 1 from envois_prospection e join campagnes c on c.id = e.campagne_id
                    where lower(e.email) = normaliser_email(p.email) and c.automatique = 'relance')
    and not exists (select 1 from envois_prospection e join visites_prospection v on v.envoi_id = e.id
                    where lower(e.email) = normaliser_email(p.email))
  order by normaliser_email(p.email), p.id
$$;

-- Appelée par le VPS à chaque passage : programme au plus p_limite e-mails automatiques par jour
-- (premiers e-mails d'abord, puis relances). Sans effet tant que la prospection est désactivée.
create function programmer_prospection_auto(p_limite integer) returns integer
language plpgsql security definer set search_path = public as $$
declare
  r reglages_prospection;
  jour date := jour_reunion();
  deja integer;
  total integer := 0;
  n integer;
  c uuid;
  t text;
begin
  select * into r from reglages_prospection where id = 1;
  if not r.actif then
    return 0;
  end if;
  select count(*) into deja from envois_prospection e join campagnes ca on ca.id = e.campagne_id
   where ca.automatique is not null and (ca.cree_le at time zone 'Indian/Reunion')::date = jour;
  foreach t in array array['lancement', 'relance'] loop
    continue when t = 'relance' and not r.relance;
    exit when deja + total >= p_limite;
    select id into c from campagnes
     where automatique = t and (cree_le at time zone 'Indian/Reunion')::date = jour limit 1;
    if c is null then
      insert into campagnes (sujet, message, automatique)
      values (case when t = 'lancement' then r.sujet else r.relance_sujet end,
              case when t = 'lancement' then r.message else r.relance_message end, t)
      returning id into c;
    end if;
    if t = 'lancement' then
      insert into envois_prospection (campagne_id, prospect_id, email)
      select c, x.prospect_id, x.email from prospects_a_lancer(r.zones) x limit p_limite - deja - total
      on conflict (campagne_id, email) do nothing;
    else
      insert into envois_prospection (campagne_id, prospect_id, email)
      select c, x.prospect_id, x.email from prospects_a_relancer(r.zones, r.relance_jours) x limit p_limite - deja - total
      on conflict (campagne_id, email) do nothing;
    end if;
    get diagnostics n = row_count;
    total := total + n;
    if not exists (select 1 from envois_prospection where campagne_id = c) then
      delete from campagnes where id = c;
    end if;
    c := null;
  end loop;
  return total;
end $$;
revoke execute on function prospects_a_lancer(text[]), prospects_a_relancer(text[], integer), programmer_prospection_auto(integer)
  from public, anon, authenticated;

-- Espace admin : réglages et aperçu (combien d'établissements seraient écrits aujourd'hui).
create function admin_reglages_prospection()
returns table (actif boolean, zones text[], sujet text, message text, relance boolean, relance_jours integer,
               relance_sujet text, relance_message text, a_lancer integer, a_relancer integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select r.actif, r.zones, r.sujet, r.message, r.relance, r.relance_jours, r.relance_sujet, r.relance_message,
           (select count(*)::integer from prospects_a_lancer(r.zones)),
           (select count(*)::integer from prospects_a_relancer(r.zones, r.relance_jours))
    from reglages_prospection r where r.id = 1;
end $$;

create function admin_regler_prospection(p_actif boolean, p_zones text[], p_sujet text, p_message text, p_relance boolean,
                                         p_relance_jours integer, p_relance_sujet text, p_relance_message text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin();
  update reglages_prospection
     set actif = p_actif, zones = p_zones, sujet = nullif(btrim(p_sujet), ''), message = nullif(btrim(p_message), ''),
         relance = p_relance, relance_jours = p_relance_jours,
         relance_sujet = nullif(btrim(p_relance_sujet), ''), relance_message = nullif(btrim(p_relance_message), ''),
         maj_le = now()
   where id = 1;
end $$;

revoke execute on function admin_reglages_prospection(), admin_regler_prospection(boolean, text[], text, text, boolean, integer, text, text)
  from public, anon;
grant execute on function admin_reglages_prospection(), admin_regler_prospection(boolean, text[], text, text, boolean, integer, text, text)
  to authenticated;
