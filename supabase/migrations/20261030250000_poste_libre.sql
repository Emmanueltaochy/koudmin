-- Poste libre : l'établissement écrit l'intitulé (obligatoire) et une description (facultative)
-- quand le métier n'est pas dans la liste de son secteur. Ouvert à tous les secteurs.
-- La valeur « autre » n'est comparée qu'en texte ici : une valeur d'enum ajoutée ne peut pas
-- servir comme littéral dans la transaction qui l'ajoute.

alter type poste add value 'autre';

alter table demandes
  add column intitule text check (intitule is null or char_length(btrim(intitule)) between 2 and 60),
  add column description_poste text check (description_poste is null or char_length(description_poste) <= 500),
  add constraint poste_libre_intitule check ((poste::text = 'autre') = (intitule is not null));

create or replace function verifier_poste_secteur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.poste::text <> 'autre'
     and not (new.poste::text = any (postes_du_secteur((select secteur from restaurants where id = new.restaurant_id)))) then
    raise exception 'Métier non autorisé pour ce secteur' using errcode = '23514';
  end if;
  return new;
end $$;

drop function missions_disponibles();
create function missions_disponibles()
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, intitule text
)
language sql stable security definer set search_path = public as $$
  select d.id, r.nom, d.commune, distance_metres(e.lat, e.lng, d.lat, d.lng), d.poste,
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour, d.intitule
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

drop function detail_mission(uuid);
create function detail_mission(p_demande uuid)
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, tenue text,
  confirmee boolean, disponible boolean,
  adresse text, code_postal text, acces text, telephone text, lat double precision, lng double precision,
  intitule text, description_poste text
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
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour,
         coalesce(d.tenue, d.consignes),
         d.confirmee,
         d.statut = 'publiee' and debut_mission(d.jour, d.debut) > now(),
         case when d.confirmee then d.adresse end,
         case when d.confirmee then d.code_postal end,
         case when d.confirmee then d.acces end,
         case when d.confirmee then d.tel_restaurant end,
         d.lat,
         d.lng,
         d.intitule,
         d.description_poste
  from d cross join moi
  where d.statut in ('publiee', 'pourvue')
     or exists (select 1 from affectations a where a.demande_id = d.id and a.extra_id = auth.uid())
$$;

drop function mes_missions();
create function mes_missions()
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, contrat_signe boolean, annulee boolean, passee boolean, intitule text
)
language sql stable security definer set search_path = public as $$
  select id, restaurant, commune, distance_metres, poste, jour, debut, fin, taux_horaire_brut_centimes,
         retour_assure, bus_retour, contrat_signe, annulee, fin_prevue <= now(), intitule
  from (
    select d.id, r.nom as restaurant, d.commune, distance_metres(e.lat, e.lng, d.lat, d.lng), d.poste,
           d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour, d.intitule,
           exists (select 1 from contrats c where c.affectation_id = a.id and c.signe_extra_le is not null) as contrat_signe,
           d.statut = 'annulee' as annulee,
           debut_mission(d.jour, d.debut)
             + make_interval(mins => case when d.fin > d.debut then d.fin - d.debut else d.fin + 1440 - d.debut end)
             as fin_prevue
    from affectations a
    join demandes d on d.id = a.demande_id
    join restaurants r on r.id = d.restaurant_id
    join extras e on e.id = a.extra_id
    where a.extra_id = auth.uid()
      and a.statut = 'confirmee'
  ) m
  where fin_prevue > now() - interval '30 days'
  order by annulee or fin_prevue <= now(), jour, debut
$$;

drop function mes_gains();
create function mes_gains()
returns table (demande_id uuid, restaurant text, commune text, poste poste, jour date, debut smallint, fin smallint,
               taux_horaire_brut_centimes integer, effectuee boolean, contrat_signe_extra boolean, contrat_signe_restaurant boolean,
               intitule text)
language sql stable security definer set search_path = public as $$
  select d.id, r.nom, d.commune, d.poste, d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes,
         debut_mission(d.jour, d.debut) + make_interval(mins => duree_mission(d.debut, d.fin)) <= now(),
         coalesce(c.signe_extra_le is not null, false),
         coalesce(c.signe_restaurant_le is not null, false),
         d.intitule
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join contrats c on c.affectation_id = a.id
  where a.extra_id = auth.uid()
    and a.statut in ('confirmee', 'terminee')
    and d.statut <> 'annulee'
  order by d.jour desc, d.debut desc
$$;

drop function admin_demandes(integer);
create function admin_demandes(p_limite integer default 100)
returns table (id uuid, etablissement text, commune text, poste poste, jour date, debut smallint, fin smallint,
               nb_extras smallint, pourvues integer, statut statut_demande, publiee_le timestamptz,
               delai_minutes integer, frais_ht_centimes integer, intitule text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select d.id, r.nom, d.commune, d.poste, d.jour, d.debut, d.fin, d.nb_extras,
           (select count(*)::integer from affectations a where a.demande_id = d.id and a.statut in ('confirmee', 'terminee', 'absente')),
           d.statut, d.created_at,
           (select (extract(epoch from min(a.created_at) - d.created_at) / 60)::integer from affectations a where a.demande_id = d.id),
           d.frais_mise_en_relation_ht_centimes,
           d.intitule
    from demandes d join restaurants r on r.id = d.restaurant_id
    order by d.created_at desc
    limit least(greatest(p_limite, 1), 500);
end $$;

revoke execute on function missions_disponibles(), detail_mission(uuid), mes_missions(), mes_gains(), admin_demandes(integer)
  from public, anon;
grant execute on function missions_disponibles(), detail_mission(uuid), mes_missions(), mes_gains(), admin_demandes(integer)
  to authenticated;
