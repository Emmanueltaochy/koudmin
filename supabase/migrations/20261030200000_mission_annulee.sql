-- Demande annulée par l'établissement après l'acceptation : l'extra la voit grisée
-- (« L'entreprise a annulé la mission ») jusqu'à l'heure de fin prévue, et ne peut plus
-- signer le contrat.
drop function mes_missions();
create function mes_missions()
returns table (
  id uuid, restaurant text, commune text, distance_metres integer, poste poste,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  retour_assure boolean, bus_retour smallint, contrat_signe boolean, annulee boolean
)
language sql stable security definer set search_path = public as $$
  select d.id, r.nom, d.commune, distance_metres(e.lat, e.lng, d.lat, d.lng), d.poste,
         d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes, d.retour_assure, d.bus_retour,
         exists (select 1 from contrats c where c.affectation_id = a.id and c.signe_extra_le is not null),
         d.statut = 'annulee'
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  join extras e on e.id = a.extra_id
  where a.extra_id = auth.uid()
    and a.statut = 'confirmee'
    and debut_mission(d.jour, d.debut)
        + make_interval(mins => case when d.fin > d.debut then d.fin - d.debut else d.fin + 1440 - d.debut end)
        > now()
  order by d.statut = 'annulee', d.jour, d.debut
$$;
revoke execute on function mes_missions() from public, anon;
grant execute on function mes_missions() to authenticated;

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
  if length(p_signature) < 100 or length(p_signature) > 200000 then
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
