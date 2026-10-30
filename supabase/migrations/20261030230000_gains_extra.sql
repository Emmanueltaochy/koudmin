-- « Mes gains » de l'extra : ses missions avec contrat, passées et à venir, et ce que chacune
-- rapporte (salaire brut calculé dans l'app à partir de la durée et du taux du contrat).
-- Missions annulées, désistements et absences exclus.
create function mes_gains()
returns table (demande_id uuid, restaurant text, commune text, poste poste, jour date, debut smallint, fin smallint,
               taux_horaire_brut_centimes integer, effectuee boolean, contrat_signe_extra boolean, contrat_signe_restaurant boolean)
language sql stable security definer set search_path = public as $$
  select d.id, r.nom, d.commune, d.poste, d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes,
         debut_mission(d.jour, d.debut) + make_interval(mins => duree_mission(d.debut, d.fin)) <= now(),
         coalesce(c.signe_extra_le is not null, false),
         coalesce(c.signe_restaurant_le is not null, false)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join contrats c on c.affectation_id = a.id
  where a.extra_id = auth.uid()
    and a.statut in ('confirmee', 'terminee')
    and d.statut <> 'annulee'
  order by d.jour desc, d.debut desc
$$;
revoke execute on function mes_gains() from public, anon;
grant execute on function mes_gains() to authenticated;
