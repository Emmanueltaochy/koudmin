-- Plusieurs établissements par compte, plusieurs utilisateurs par établissement.
-- Rôles : « gerant » (établissements, utilisateurs, factures) et « equipe » (demandes, suivi,
-- contrats, notation). Un nouvel utilisateur est invité par son mobile et rejoint
-- l'établissement à sa première connexion (accepter_invitations).

create type role_membre as enum ('gerant', 'equipe');

create table membres (
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  role role_membre not null default 'equipe',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, utilisateur_id)
);
create index membres_utilisateur on membres (utilisateur_id);

create table invitations (
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  telephone text not null check (telephone ~ '^\+26269[23][0-9]{6}$'),
  role role_membre not null default 'equipe',
  invite_par uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, telephone)
);

-- Lues et écrites uniquement par les fonctions ci-dessous.
alter table membres enable row level security;
alter table invitations enable row level security;

-- Le créateur d'un établissement en est gérant (création en ligne, graine, ajouter-restaurant.sh).
create function membre_createur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.proprietaire is not null then
    insert into membres (restaurant_id, utilisateur_id, role) values (new.id, new.proprietaire, 'gerant')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger membre_createur after insert on restaurants for each row execute function membre_createur();

insert into membres (restaurant_id, utilisateur_id, role)
  select id, proprietaire, 'gerant' from restaurants where proprietaire is not null
  on conflict do nothing;

create function mes_restaurants() returns setof uuid
language sql stable security definer set search_path = public as $$
  select restaurant_id from membres where utilisateur_id = auth.uid()
$$;

create function est_gerant(p_restaurant uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membres
                 where restaurant_id = p_restaurant and utilisateur_id = auth.uid() and role = 'gerant')
$$;

-- ---------------------------------------------------------------------------
-- Règles d'accès : « propriétaire » devient « membre de l'établissement ».
-- ---------------------------------------------------------------------------
drop policy "restaurateur : son restaurant" on restaurants;
create policy "membre : ses établissements" on restaurants for select to authenticated
  using (id in (select mes_restaurants()));

drop policy "restaurateur : ses demandes" on demandes;
create policy "membre : demandes de ses établissements" on demandes for all to authenticated
  using (restaurant_id in (select mes_restaurants()))
  with check (restaurant_id in (select mes_restaurants()));

drop policy "restaurateur : affectations de ses demandes" on affectations;
create policy "membre : affectations de ses demandes" on affectations for select to authenticated
  using (demande_id in (select d.id from demandes d where d.restaurant_id in (select mes_restaurants())));

drop policy "restaurateur : extras affectés" on extras;
create policy "membre : extras affectés" on extras for select to authenticated
  using (id in (
    select a.extra_id from affectations a join demandes d on d.id = a.demande_id
    where d.restaurant_id in (select mes_restaurants())));

drop policy "restaurateur : photos des extras affectés" on photos_extras;
create policy "membre : photos des extras affectés" on photos_extras for select to authenticated
  using (extra_id in (
    select a.extra_id from affectations a join demandes d on d.id = a.demande_id
    where d.restaurant_id in (select mes_restaurants())));

drop policy "restaurateur : ses favoris" on favoris;
create policy "membre : favoris de ses établissements" on favoris for all to authenticated
  using (restaurant_id in (select mes_restaurants()))
  with check (restaurant_id in (select mes_restaurants()));

-- Un même compte est soit extra, soit membre d'établissements.
drop policy "extra : son profil" on extras;
create policy "extra : son profil" on extras for all to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and telephone = telephone_verifie()
    and not exists (select 1 from mes_restaurants()));

create or replace function partie_au_contrat(p_affectation uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when a.extra_id = auth.uid() then 'extra'
    when exists (select 1 from membres m where m.restaurant_id = d.restaurant_id and m.utilisateur_id = auth.uid())
      then 'restaurant'
  end
  from affectations a
  join demandes d on d.id = a.demande_id
  where a.id = p_affectation
$$;

-- Factures : par établissement (chaque SIRET est facturé à part), réservées aux gérants.
drop function factures_restaurant();
create function factures_restaurant(p_restaurant uuid)
returns table (mois text, mises_en_relation integer, montant_ht_centimes integer, tva_pour_mille integer)
language sql stable security definer set search_path = public as $$
  select to_char(d.jour, 'YYYY-MM'),
         count(*)::integer,
         sum(d.frais_mise_en_relation_ht_centimes)::integer,
         (parametres_en_vigueur(max(d.jour))).tva_pour_mille
  from affectations a
  join demandes d on d.id = a.demande_id
  where d.restaurant_id = p_restaurant
    and est_gerant(p_restaurant)
    and a.statut in ('confirmee', 'terminee')
    and debut_mission(d.jour, d.debut) < now()
  group by 1
  order by 1 desc
$$;

-- ---------------------------------------------------------------------------
-- Établissements : création (inscription ou établissement supplémentaire), modification.
-- ---------------------------------------------------------------------------
drop function creer_restaurant(text, text, text, text, text, double precision, double precision);
create function creer_restaurant(
  p_nom text, p_siret text, p_adresse text, p_code_postal text, p_commune text, p_lat double precision, p_lng double precision
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_siret text := regexp_replace(coalesce(p_siret, ''), '[^0-9]', '', 'g');
  v_nom text := btrim(coalesce(p_nom, ''));
  id_restaurant uuid;
begin
  if uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if exists (select 1 from extras where id = uid) then
    raise exception 'Ce compte est un compte extra' using errcode = '23514';
  end if;
  if v_nom = '' or char_length(v_nom) > 120 then
    raise exception 'Nom de l''établissement invalide' using errcode = '22023';
  end if;
  if not siret_valide(v_siret) then
    raise exception 'Numéro SIRET invalide' using errcode = '22023';
  end if;
  if exists (select 1 from restaurants where restaurants.siret = v_siret) then
    raise exception 'SIRET déjà inscrit' using errcode = '23505';
  end if;
  if coalesce(p_code_postal, '') !~ '^974[0-9]{2}$'
     or p_lat not between -21.5 and -20.8 or p_lng not between 55.1 and 55.9 then
    raise exception 'Adresse hors de La Réunion' using errcode = '22023';
  end if;

  insert into restaurants (proprietaire, nom, telephone, siret, adresse, code_postal, commune, lat, lng)
  values (uid, v_nom, telephone_verifie(), v_siret, btrim(p_adresse), p_code_postal, btrim(p_commune), p_lat, p_lng)
  returning id into id_restaurant;
  return id_restaurant;
end $$;

create function modifier_etablissement(
  p_restaurant uuid, p_nom text, p_adresse text, p_code_postal text, p_commune text, p_lat double precision, p_lng double precision
) returns void
language plpgsql security definer set search_path = public as $$
declare v_nom text := btrim(coalesce(p_nom, ''));
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant' using errcode = '42501';
  end if;
  if v_nom = '' or char_length(v_nom) > 120 then
    raise exception 'Nom de l''établissement invalide' using errcode = '22023';
  end if;
  if coalesce(p_code_postal, '') !~ '^974[0-9]{2}$'
     or p_lat not between -21.5 and -20.8 or p_lng not between 55.1 and 55.9 then
    raise exception 'Adresse hors de La Réunion' using errcode = '22023';
  end if;
  update restaurants set nom = v_nom, adresse = btrim(p_adresse), code_postal = p_code_postal,
         commune = btrim(p_commune), lat = p_lat, lng = p_lng
   where id = p_restaurant;
end $$;

-- Établissements de l'utilisateur, avec son rôle dans chacun.
create function mes_etablissements()
returns table (id uuid, nom text, telephone text, siret text, adresse text, code_postal text, commune text,
               lat double precision, lng double precision, role role_membre)
language sql stable security definer set search_path = public as $$
  select r.id, r.nom, r.telephone, r.siret, r.adresse, r.code_postal, r.commune, r.lat, r.lng, m.role
  from membres m join restaurants r on r.id = m.restaurant_id
  where m.utilisateur_id = auth.uid()
  order by r.created_at, r.nom
$$;

-- ---------------------------------------------------------------------------
-- Utilisateurs d'un établissement : liste, invitation, rôle, retrait.
-- ---------------------------------------------------------------------------
create function equipe_etablissement(p_restaurant uuid)
returns table (utilisateur_id uuid, telephone text, role role_membre, en_attente boolean, moi boolean)
language sql stable security definer set search_path = public as $$
  select m.utilisateur_id, '+' || u.phone, m.role, false, m.utilisateur_id = auth.uid()
  from membres m join auth.users u on u.id = m.utilisateur_id
  where m.restaurant_id = p_restaurant and p_restaurant in (select mes_restaurants())
  union all
  select null, i.telephone, i.role, true, false
  from invitations i
  where i.restaurant_id = p_restaurant and p_restaurant in (select mes_restaurants())
  order by 4, 3, 2
$$;

create function inviter_membre(p_restaurant uuid, p_telephone text, p_role role_membre) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant' using errcode = '42501';
  end if;
  if coalesce(p_telephone, '') !~ '^\+26269[23][0-9]{6}$' then
    raise exception 'Numéro de mobile invalide' using errcode = '22023';
  end if;
  if exists (select 1 from membres m join auth.users u on u.id = m.utilisateur_id
             where m.restaurant_id = p_restaurant and '+' || u.phone = p_telephone) then
    raise exception 'Ce numéro a déjà accès à l''établissement' using errcode = '23505';
  end if;
  if exists (select 1 from extras where telephone = p_telephone) then
    raise exception 'Ce numéro est un compte extra' using errcode = '23514';
  end if;
  insert into invitations (restaurant_id, telephone, role, invite_par)
  values (p_restaurant, p_telephone, p_role, auth.uid())
  on conflict (restaurant_id, telephone) do update set role = excluded.role;
end $$;

create function annuler_invitation(p_restaurant uuid, p_telephone text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant' using errcode = '42501';
  end if;
  delete from invitations where restaurant_id = p_restaurant and telephone = p_telephone;
end $$;

-- Un établissement garde toujours au moins un gérant.
create function verifier_un_gerant(p_restaurant uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from membres where restaurant_id = p_restaurant and role = 'gerant') then
    raise exception 'Au moins un gérant requis' using errcode = '23514';
  end if;
end $$;

create function changer_role(p_restaurant uuid, p_utilisateur uuid, p_role role_membre) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant' using errcode = '42501';
  end if;
  update membres set role = p_role where restaurant_id = p_restaurant and utilisateur_id = p_utilisateur;
  perform verifier_un_gerant(p_restaurant);
end $$;

create function retirer_membre(p_restaurant uuid, p_utilisateur uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant' using errcode = '42501';
  end if;
  delete from membres where restaurant_id = p_restaurant and utilisateur_id = p_utilisateur;
  perform verifier_un_gerant(p_restaurant);
end $$;

-- À la connexion : les invitations au mobile vérifié du compte deviennent des accès.
create function accepter_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare
  tel text := telephone_verifie();
  n integer;
begin
  if tel is null or exists (select 1 from extras where id = auth.uid()) then
    return 0;
  end if;
  insert into membres (restaurant_id, utilisateur_id, role)
    select restaurant_id, auth.uid(), role from invitations where telephone = tel
  on conflict (restaurant_id, utilisateur_id) do nothing;
  get diagnostics n = row_count;
  delete from invitations where telephone = tel;
  return n;
end $$;

revoke execute on function mes_restaurants(), est_gerant(uuid), factures_restaurant(uuid),
  creer_restaurant(text, text, text, text, text, double precision, double precision),
  modifier_etablissement(uuid, text, text, text, text, double precision, double precision),
  mes_etablissements(), equipe_etablissement(uuid), inviter_membre(uuid, text, role_membre),
  annuler_invitation(uuid, text), verifier_un_gerant(uuid), changer_role(uuid, uuid, role_membre),
  retirer_membre(uuid, uuid), accepter_invitations(), membre_createur() from public, anon;
grant execute on function mes_restaurants(), est_gerant(uuid), factures_restaurant(uuid),
  creer_restaurant(text, text, text, text, text, double precision, double precision),
  modifier_etablissement(uuid, text, text, text, text, double precision, double precision),
  mes_etablissements(), equipe_etablissement(uuid), inviter_membre(uuid, text, role_membre),
  annuler_invitation(uuid, text), changer_role(uuid, uuid, role_membre),
  retirer_membre(uuid, uuid), accepter_invitations() to authenticated;
