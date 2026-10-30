-- Quatrième mode de paiement : prélèvement SEPA à chaque mission (24 h après la fin, comme la carte).

alter table moyens_paiement drop constraint moyens_paiement_mode_check;
alter table moyens_paiement add constraint moyens_paiement_mode_check
  check (mode in ('carte_mission', 'sepa_mission', 'mensuel_carte', 'mensuel_sepa'));

-- Débits à la mission : carte (Stripe) ou prélèvement (GoCardless, mandat valide seulement).
drop function paiements_a_lancer(uuid);
create function paiements_a_lancer(p_restaurant uuid default null)
returns table (affectation_id uuid, restaurant_id uuid, moyen text, libelle text,
               montant_ht_centimes integer, tva_centimes integer)
language sql stable security definer set search_path = public as $$
  select a.id, d.restaurant_id,
         case when m.mode = 'sepa_mission' then 'sepa' else 'carte' end,
         concat('Kivien · mise en relation du ', to_char(d.jour, 'DD/MM/YYYY'), ' · ', r.nom),
         d.frais_mise_en_relation_ht_centimes,
         tva_centimes(d.frais_mise_en_relation_ht_centimes, (parametres_en_vigueur(d.jour)).tva_pour_mille)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  join moyens_paiement m on m.restaurant_id = d.restaurant_id
  cross join reglages_paiement g
  where a.statut in ('confirmee', 'terminee')
    and d.statut <> 'annulee'
    and ((m.mode = 'carte_mission' and m.stripe_carte is not null)
      or (m.mode = 'sepa_mission' and m.gocardless_mandat is not null
          and m.mandat_statut in ('pending_customer_approval', 'pending_submission', 'submitted', 'active')))
    and d.jour >= g.debut
    and fin_mission(d.jour, d.debut, d.fin) + interval '24 hours' <= now()
    and not exists (select 1 from paiements p where p.affectation_id = a.id)
    -- Déjà comprise dans une facture mensuelle (changement de mode en cours de mois).
    and not exists (select 1 from paiements p where p.restaurant_id = d.restaurant_id and p.type = 'mensuel'
                    and p.mois = to_char(d.jour, 'YYYY-MM'))
    and (p_restaurant is null or d.restaurant_id = p_restaurant)
  order by d.jour, d.debut
  limit 200
$$;
revoke execute on function paiements_a_lancer(uuid) from public, anon, authenticated;
grant execute on function paiements_a_lancer(uuid) to service_role;
