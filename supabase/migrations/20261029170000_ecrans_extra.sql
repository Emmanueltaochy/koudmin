-- Étape e, côté extra : missions confirmées, contrat, consignes dans le détail.

-- Le détail montre les consignes du restaurateur quand il n'y a pas de tenue précisée.
create or replace function detail_mission(p_demande uuid)
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
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour,
         coalesce(d.tenue, d.consignes),
         d.confirmee,
         d.statut = 'publiee' and debut_mission(d.jour, d.debut) > now(),
         case when d.confirmee then d.adresse end,
         case when d.confirmee then d.code_postal end,
         case when d.confirmee then d.acces end,
         case when d.confirmee then d.tel_restaurant end,
         case when d.confirmee then d.lat end,
         case when d.confirmee then d.lng end
  from d cross join moi
  where d.statut in ('publiee', 'pourvue')
     or exists (select 1 from affectations a where a.demande_id = d.id and a.extra_id = auth.uid())
$$;

-- Missions confirmées à venir (ou en cours) de l'extra connecté.
create function mes_missions()
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, contrat_signe boolean
)
language sql stable security definer set search_path = public as $$
  select d.id, r.nom, d.commune, distance_metres(e.lat, e.lng, d.lat, d.lng), d.poste,
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour,
         exists (select 1 from contrats c where c.affectation_id = a.id and c.signe_extra_le is not null)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  join extras e on e.id = a.extra_id
  where a.extra_id = auth.uid()
    and a.statut = 'confirmee'
    and debut_mission(d.jour, d.debut)
        + make_interval(mins => case when d.fin > d.debut then d.fin - d.debut else d.fin + 1440 - d.debut end)
        > now()
  order by d.jour, d.debut
$$;

-- Ce qu'il faut à l'extra pour lire et signer son contrat.
create function contrat_extra(p_demande uuid)
returns table (
  affectation_id uuid, employeur text, adresse_employeur text,
  signe_extra boolean, signe_restaurant boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, r.nom,
         concat_ws(', ', coalesce(r.adresse, d.adresse), concat_ws(' ', coalesce(r.code_postal, d.code_postal), coalesce(r.commune, d.commune))),
         coalesce(c.signe_extra_le is not null, false),
         coalesce(c.signe_restaurant_le is not null, false)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join contrats c on c.affectation_id = a.id
  where a.demande_id = p_demande and a.extra_id = auth.uid() and a.statut = 'confirmee'
$$;

revoke execute on function mes_missions(), contrat_extra(uuid) from public, anon;
grant execute on function mes_missions(), contrat_extra(uuid) to authenticated;

-- Le téléphone du profil est forcément celui vérifié par SMS (auth.users.phone, stocké sans « + »).
-- Fonction security definer : le rôle authenticated n'a pas accès à auth.users.
create function telephone_verifie() returns text
language sql stable security definer set search_path = public as $$
  select '+' || phone from auth.users where id = auth.uid()
$$;
revoke execute on function telephone_verifie() from public, anon;
grant execute on function telephone_verifie() to authenticated;

drop policy "extra : son profil" on extras;
create policy "extra : son profil" on extras for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and telephone = telephone_verifie());
