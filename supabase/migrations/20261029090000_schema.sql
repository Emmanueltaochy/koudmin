-- Koudmin : schéma initial.
-- Une seule base pour l'app extra et le site restaurateur. Les montants sont en centimes,
-- les horaires en minutes depuis minuit (0–1439), les jours à l'heure de La Réunion.

create type poste as enum ('serveur', 'plonge', 'commis', 'barman', 'reception');
create type statut_demande as enum ('publiee', 'pourvue', 'annulee', 'terminee');
create type statut_affectation as enum ('confirmee', 'desistee', 'absente', 'terminee');

-- Jour courant à La Réunion.
create function jour_reunion() returns date
language sql stable as $$ select (now() at time zone 'Indian/Reunion')::date $$;

-- Minute courante (0–1439) à La Réunion.
create function minute_reunion() returns smallint
language sql stable as $$
  select (extract(hour from now() at time zone 'Indian/Reunion') * 60
        + extract(minute from now() at time zone 'Indian/Reunion'))::smallint $$;

-- ---------------------------------------------------------------------------
-- Paramètres tarifaires : une ligne par date d'effet (SMIC revalorisé chaque 1er janvier).
-- ---------------------------------------------------------------------------
create table parametres (
  date_effet date primary key,
  taux_horaire_brut_centimes integer not null check (taux_horaire_brut_centimes > 0),
  frais_mise_en_relation_ht_centimes integer not null check (frais_mise_en_relation_ht_centimes >= 0)
);

create function parametres_en_vigueur(p_jour date default jour_reunion())
returns parametres language sql stable as $$
  select * from parametres where date_effet <= p_jour order by date_effet desc limit 1
$$;

-- ---------------------------------------------------------------------------
-- Comptes
-- ---------------------------------------------------------------------------
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid references auth.users (id) on delete set null,
  nom text not null,
  telephone text,
  created_at timestamptz not null default now()
);

create table extras (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text not null,
  telephone text not null unique check (telephone ~ '^\+26269[23][0-9]{6}$'),
  commune text not null,
  lat double precision not null,
  lng double precision not null,
  a_voiture boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Demandes (côté restaurateur) et affectations (un extra sur une demande)
-- ---------------------------------------------------------------------------
create table demandes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  poste poste not null,
  jour date not null,
  debut smallint not null check (debut between 0 and 1439),
  fin smallint not null check (fin between 0 and 1439 and fin <> debut),
  -- Figés à la publication depuis `parametres` (trigger figer_tarifs).
  taux_horaire_brut_centimes integer not null,
  frais_mise_en_relation_ht_centimes integer not null,
  adresse text not null,
  code_postal text,
  commune text not null,
  acces text,
  lat double precision not null,
  lng double precision not null,
  retour_assure boolean not null default false,
  -- Heure du bus de retour le plus tardif (fictif pour l'instant, calculé plus tard).
  bus_retour smallint check (bus_retour between 0 and 1439),
  tenue text,
  consignes text,
  nb_extras smallint not null default 1 check (nb_extras >= 1),
  statut statut_demande not null default 'publiee',
  created_at timestamptz not null default now()
);
create index demandes_ouvertes on demandes (jour) where statut = 'publiee';

create table affectations (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes (id) on delete cascade,
  extra_id uuid not null references extras (id) on delete cascade,
  statut statut_affectation not null default 'confirmee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (demande_id, extra_id)
);

-- Fige taux et frais à la publication. Le taux peut monter au-dessus du SMIC, jamais descendre.
create function figer_tarifs() returns trigger language plpgsql as $$
declare p parametres;
begin
  p := parametres_en_vigueur();
  if p.date_effet is null then
    raise exception 'Aucun paramètre tarifaire en vigueur';
  end if;
  new.frais_mise_en_relation_ht_centimes := p.frais_mise_en_relation_ht_centimes;
  new.taux_horaire_brut_centimes := coalesce(new.taux_horaire_brut_centimes, p.taux_horaire_brut_centimes);
  if new.taux_horaire_brut_centimes < p.taux_horaire_brut_centimes then
    raise exception 'Taux horaire sous le minimum légal' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger figer_tarifs before insert on demandes for each row execute function figer_tarifs();

-- Distance à vol d'oiseau, en mètres (haversine).
create function distance_metres(lat1 double precision, lng1 double precision,
                                lat2 double precision, lng2 double precision)
returns integer language sql immutable as $$
  select round(2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))::integer
$$;

-- ---------------------------------------------------------------------------
-- Signaux temps réel. Les extras n'ont pas accès aux demandes (adresse exacte cachée
-- avant confirmation) : ils écoutent ce flux sans donnée sensible, puis rechargent.
-- ---------------------------------------------------------------------------
create table signaux_missions (
  id bigint generated always as identity primary key,
  demande_id uuid not null,
  created_at timestamptz not null default now()
);

create function signaler_demande() returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into signaux_missions (demande_id) values (new.id);
  return null;
end $$;
create trigger signaler after insert or update on demandes
  for each row execute function signaler_demande();

-- ---------------------------------------------------------------------------
-- API extra (fonctions security definer : l'extra ne lit jamais les tables directement)
-- ---------------------------------------------------------------------------

-- Missions ouvertes, à partir d'aujourd'hui, avec la distance depuis l'extra connecté.
-- Pas d'adresse exacte : seulement la commune.
create function missions_disponibles()
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint
)
language sql stable security definer set search_path = public as $$
  select d.id, r.nom, d.commune, distance_metres(e.lat, e.lng, d.lat, d.lng), d.poste,
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour
  from demandes d
  join restaurants r on r.id = d.restaurant_id
  join extras e on e.id = auth.uid()
  where d.statut = 'publiee'
    and (d.jour > jour_reunion() or (d.jour = jour_reunion() and d.debut > minute_reunion()))
    and not exists (
      select 1 from affectations a
      where a.demande_id = d.id and a.extra_id = e.id and a.statut = 'confirmee'
    )
$$;

-- « Mi lé la ». Atomique : la ligne de la demande est verrouillée, deux extras qui
-- acceptent en même temps sont départagés. Renvoie 'confirmee' ou 'deja_prise'.
create function accepter_mission(p_demande uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  d demandes;
  pris integer;
  moi uuid := auth.uid();
begin
  if moi is null or not exists (select 1 from extras where id = moi) then
    raise exception 'Réservé aux extras' using errcode = 'insufficient_privilege';
  end if;

  select * into d from demandes where id = p_demande for update;
  if not found or d.statut <> 'publiee' then
    return 'deja_prise';
  end if;

  if exists (select 1 from affectations
             where demande_id = d.id and extra_id = moi and statut = 'confirmee') then
    return 'confirmee';
  end if;

  select count(*) into pris from affectations where demande_id = d.id and statut = 'confirmee';
  if pris >= d.nb_extras then
    return 'deja_prise';
  end if;

  insert into affectations (demande_id, extra_id) values (d.id, moi)
  on conflict (demande_id, extra_id)
  do update set statut = 'confirmee', updated_at = now();

  if pris + 1 >= d.nb_extras then
    update demandes set statut = 'pourvue' where id = d.id;
  end if;
  return 'confirmee';
end $$;

-- Désistement : la place se libère et la demande redevient visible.
-- La règle d'exclusion (moins de 4 h avant) est traitée côté back-office.
create function se_desister(p_demande uuid) returns void
language plpgsql security definer set search_path = public as $$
declare moi uuid := auth.uid();
begin
  update affectations set statut = 'desistee', updated_at = now()
  where demande_id = p_demande and extra_id = moi and statut = 'confirmee';
  if not found then
    raise exception 'Aucune mission confirmée à libérer';
  end if;
  update demandes set statut = 'publiee' where id = p_demande and statut = 'pourvue';
end $$;

-- ---------------------------------------------------------------------------
-- Sécurité (RLS)
-- ---------------------------------------------------------------------------
alter table parametres enable row level security;
alter table restaurants enable row level security;
alter table extras enable row level security;
alter table demandes enable row level security;
alter table affectations enable row level security;
alter table signaux_missions enable row level security;

create policy "lecture des paramètres" on parametres for select to authenticated using (true);

create policy "restaurateur : son restaurant" on restaurants for all to authenticated
  using (proprietaire = auth.uid()) with check (proprietaire = auth.uid());

create policy "extra : son profil" on extras for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "restaurateur : ses demandes" on demandes for all to authenticated
  using (restaurant_id in (select id from restaurants where proprietaire = auth.uid()))
  with check (restaurant_id in (select id from restaurants where proprietaire = auth.uid()));

create policy "restaurateur : affectations de ses demandes" on affectations for select to authenticated
  using (demande_id in (
    select d.id from demandes d join restaurants r on r.id = d.restaurant_id
    where r.proprietaire = auth.uid()));

create policy "extra : ses affectations" on affectations for select to authenticated
  using (extra_id = auth.uid());

-- Le restaurateur voit le prénom des extras affectés à ses demandes (notification « mi lé la »).
create policy "restaurateur : extras affectés" on extras for select to authenticated
  using (id in (
    select a.extra_id from affectations a
    join demandes d on d.id = a.demande_id
    join restaurants r on r.id = d.restaurant_id
    where r.proprietaire = auth.uid()));

create policy "lecture des signaux" on signaux_missions for select to authenticated using (true);

revoke execute on function accepter_mission(uuid), se_desister(uuid), missions_disponibles() from public, anon;
grant execute on function accepter_mission(uuid), se_desister(uuid), missions_disponibles() to authenticated;

-- ---------------------------------------------------------------------------
-- Temps réel : le site suit ses demandes et affectations, l'app suit les signaux.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table demandes, affectations, signaux_missions;
