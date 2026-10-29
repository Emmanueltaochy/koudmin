-- Étape c : détail d'une mission côté extra, désistement tardif, missions expirées.

-- Début d'une mission, en horodatage absolu (La Réunion).
create function debut_mission(p_jour date, p_debut smallint) returns timestamptz
language sql immutable as $$
  select (p_jour + make_interval(mins => p_debut)) at time zone 'Indian/Reunion'
$$;

-- Désistement à moins de 4 h du début : marqué pour la règle d'exclusion (back-office).
alter table affectations add column desistement_tardif boolean not null default false;

-- Détail d'une mission. L'adresse exacte, l'accès et le téléphone ne sont renvoyés
-- qu'à l'extra dont la mission est confirmée.
create function detail_mission(p_demande uuid)
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, tenue text,
  confirmee boolean, disponible boolean,
  adresse text, code_postal text, acces text, telephone text, lat double precision, lng double precision
)
language sql stable security definer set search_path = public as $$
  with moi as (select * from extras where id = auth.uid()),
  d as (
    select dm.*, r.nom as nom_restaurant, r.telephone as tel_restaurant,
      exists (select 1 from affectations a where a.demande_id = dm.id
              and a.extra_id = auth.uid() and a.statut = 'confirmee') as confirmee
    from demandes dm join restaurants r on r.id = dm.restaurant_id
    where dm.id = p_demande
  )
  select d.id, d.nom_restaurant, d.commune, distance_metres(moi.lat, moi.lng, d.lat, d.lng), d.poste,
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour, d.tenue,
         d.confirmee,
         d.statut = 'publiee' and debut_mission(d.jour, d.debut) > now(),
         case when d.confirmee then d.adresse end,
         case when d.confirmee then d.code_postal end,
         case when d.confirmee then d.acces end,
         case when d.confirmee then d.tel_restaurant end,
         case when d.confirmee then d.lat end,
         case when d.confirmee then d.lng end
  from d cross join moi
  -- Visible si la mission est ouverte ou pourvue (l'extra voit alors « Mission déjà prise »),
  -- ou si l'extra y est (ou y a été) affecté. Aucune donnée sensible hors confirmation.
  where d.statut in ('publiee', 'pourvue')
     or exists (select 1 from affectations a where a.demande_id = d.id and a.extra_id = auth.uid())
$$;

revoke execute on function detail_mission(uuid) from public, anon;
grant execute on function detail_mission(uuid) to authenticated;

-- « Mi lé la » : refuse aussi une mission déjà commencée ('expiree').
create or replace function accepter_mission(p_demande uuid) returns text
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
  if not found then
    return 'deja_prise';
  end if;

  if exists (select 1 from affectations
             where demande_id = d.id and extra_id = moi and statut = 'confirmee') then
    return 'confirmee';
  end if;

  if debut_mission(d.jour, d.debut) <= now() then
    return 'expiree';
  end if;

  if d.statut <> 'publiee' then
    return 'deja_prise';
  end if;

  select count(*) into pris from affectations where demande_id = d.id and statut = 'confirmee';
  if pris >= d.nb_extras then
    return 'deja_prise';
  end if;

  insert into affectations (demande_id, extra_id) values (d.id, moi)
  on conflict (demande_id, extra_id)
  do update set statut = 'confirmee', desistement_tardif = false, updated_at = now();

  if pris + 1 >= d.nb_extras then
    update demandes set statut = 'pourvue' where id = d.id;
  end if;
  return 'confirmee';
end $$;

-- Désistement : libère la place et note s'il intervient à moins de 4 h du début.
create or replace function se_desister(p_demande uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  moi uuid := auth.uid();
  d demandes;
begin
  select * into d from demandes where id = p_demande for update;
  update affectations
     set statut = 'desistee',
         desistement_tardif = debut_mission(d.jour, d.debut) - now() < interval '4 hours',
         updated_at = now()
   where demande_id = p_demande and extra_id = moi and statut = 'confirmee';
  if not found then
    raise exception 'Aucune mission confirmée à libérer';
  end if;
  update demandes set statut = 'publiee' where id = p_demande and statut = 'pourvue';
end $$;

-- Missions disponibles : même règle de début que l'acceptation (horodatage absolu).
create or replace function missions_disponibles()
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
    and debut_mission(d.jour, d.debut) > now()
    and not exists (
      select 1 from affectations a
      where a.demande_id = d.id and a.extra_id = e.id and a.statut = 'confirmee'
    )
$$;
