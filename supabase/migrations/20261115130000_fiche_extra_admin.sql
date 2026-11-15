-- Fiche d'un extra dans l'espace admin : profil, dossier, origine, puis chaque mission (contrat,
-- pointage, note). Le numéro de sécurité sociale n'est jamais renvoyé : seulement « renseigné ».

create function admin_fiche_extra(p_extra uuid)
returns table (
  id uuid, prenom text, nom text, telephone text, email text, commune text, a_voiture boolean,
  competences poste[], experience text, langues text[], presentation text, inscrit_le timestamptz,
  alertes_email boolean, dossier_complet boolean, cgu_version text, avec_photo boolean,
  dispos_14_jours integer, comment_connu text, referent text, page_arrivee text, utm text
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select e.id, e.prenom, e.nom, e.telephone, email_confirme(e.id), e.commune, e.a_voiture,
           e.competences, e.experience, e.langues::text[], e.presentation, e.created_at,
           e.alertes_email,
           exists (select 1 from infos_contrat i where i.extra_id = e.id),
           (select max(c.version) from acceptations_cgu c where c.utilisateur_id = e.id),
           exists (select 1 from photos_extras p where p.extra_id = e.id),
           (select count(*)::integer from disponibilites d where d.extra_id = e.id
             and d.jour between jour_reunion() and jour_reunion() + 13),
           o.comment_connu, o.referent, o.page_arrivee, o.utm
    from extras e
    left join origines_comptes o on o.utilisateur_id = e.id
    where e.id = p_extra;
end $$;

create function admin_missions_extra(p_extra uuid)
returns table (
  affectation_id uuid, demande_id uuid, etablissement text, commune text, poste poste, intitule text,
  jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  statut text, statut_demande statut_demande, desistement_tardif boolean,
  contrat_signe_extra boolean, contrat_signe_restaurant boolean,
  arrivee_le timestamptz, depart_le timestamptz, present boolean, note smallint, favori boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select a.id, d.id, r.nom, d.commune, d.poste, d.intitule, d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes,
           a.statut::text, d.statut, a.desistement_tardif,
           coalesce(c.signe_extra_le is not null, false), coalesce(c.signe_restaurant_le is not null, false),
           pt.arrivee_le, pt.depart_le, n.present, n.note,
           exists (select 1 from favoris f where f.restaurant_id = d.restaurant_id and f.extra_id = a.extra_id)
    from affectations a
    join demandes d on d.id = a.demande_id
    join restaurants r on r.id = d.restaurant_id
    left join contrats c on c.affectation_id = a.id
    left join pointages pt on pt.affectation_id = a.id
    left join notations n on n.affectation_id = a.id
    where a.extra_id = p_extra
    order by d.jour desc, d.debut desc;
end $$;

revoke execute on function admin_fiche_extra(uuid), admin_missions_extra(uuid) from public, anon;
grant execute on function admin_fiche_extra(uuid), admin_missions_extra(uuid) to authenticated;
