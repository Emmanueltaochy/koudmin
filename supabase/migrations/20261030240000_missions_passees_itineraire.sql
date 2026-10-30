-- App extra : missions passées ou annulées des 30 derniers jours (affichées en bas de liste),
-- et position de l'établissement donnée avant l'acceptation pour ouvrir l'itinéraire.
-- L'adresse écrite, l'accès et le téléphone restent réservés à l'extra confirmé.

drop function mes_missions();
create function mes_missions()
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, contrat_signe boolean, annulee boolean, passee boolean
)
language sql stable security definer set search_path = public as $$
  select id, restaurant, commune, distance_metres, poste, jour, debut, fin, taux_horaire_brut_centimes,
         retour_assure, bus_retour, contrat_signe, annulee, fin_prevue <= now()
  from (
    select d.id, r.nom as restaurant, d.commune, distance_metres(e.lat, e.lng, d.lat, d.lng), d.poste,
           d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour,
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
revoke execute on function mes_missions() from public, anon;
grant execute on function mes_missions() to authenticated;

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
         d.lat,
         d.lng
  from d cross join moi
  where d.statut in ('publiee', 'pourvue')
     or exists (select 1 from affectations a where a.demande_id = d.id and a.extra_id = auth.uid())
$$;

-- Signature de l'extra : un tracé vide (bug du pavé de signature corrigé le 30/10) ne vaut pas signature.
-- Les contrats concernés repassent « à signer » pour que l'extra signe à nouveau.
update contrats set signe_extra_le = null, signature_extra = null
 where signature_extra like 'data:image/svg+xml%' and position('%3Cpath' in signature_extra) = 0;

create or replace function signer_contrat(p_affectation uuid, p_signature text) returns void
language plpgsql security definer set search_path = public as $$
declare partie text := partie_au_contrat(p_affectation);
begin
  if partie is null then
    raise exception 'Contrat introuvable' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from affectations where id = p_affectation and statut = 'confirmee') then
    raise exception 'Mission non confirmée';
  end if;
  if exists (select 1 from affectations a join demandes d on d.id = a.demande_id
             where a.id = p_affectation and d.statut = 'annulee') then
    raise exception 'Mission annulée';
  end if;
  if length(p_signature) < 100 or length(p_signature) > 200000
     or (p_signature like 'data:image/svg+xml%' and position('%3Cpath' in p_signature) = 0) then
    raise exception 'Signature invalide';
  end if;
  if partie = 'extra' and not exists (select 1 from infos_contrat where extra_id = auth.uid()) then
    raise exception 'Informations du contrat manquantes';
  end if;
  insert into contrats (affectation_id) values (p_affectation) on conflict do nothing;
  if partie = 'extra' then
    update contrats set signe_extra_le = now(), signature_extra = p_signature
     where affectation_id = p_affectation and signe_extra_le is null;
  else
    update contrats set signe_restaurant_le = now(), signature_restaurant = p_signature
     where affectation_id = p_affectation and signe_restaurant_le is null;
  end if;
end $$;
