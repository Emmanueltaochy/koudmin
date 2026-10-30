-- Espace administrateur de la plateforme (kivien.re/admin) : demande, offre, valeur.
-- Toutes les fonctions vérifient est_admin() ; aucune n'est ouverte aux établissements ni aux extras.

-- Durée d'une mission en minutes (service qui passe minuit compris).
create function duree_mission(p_debut smallint, p_fin smallint) returns integer
language sql immutable as $$
  select case when p_fin > p_debut then p_fin - p_debut else p_fin + 1440 - p_debut end
$$;

-- Salaire brut d'un extra pour une mission, congés payés (10 %) compris, en centimes.
-- Même calcul que brutParExtraCentimes() dans packages/core/src/salaire.ts.
create function brut_mission_centimes(p_debut smallint, p_fin smallint, p_taux integer) returns integer
language sql immutable as $$
  select round(duree_mission(p_debut, p_fin)::numeric * p_taux * 110 / 6000)::integer
$$;

create function verifier_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Réservé aux administrateurs Kivien' using errcode = '42501';
  end if;
end $$;

/*
 * Tableau de bord sur les `p_jours` derniers jours (demandes publiées dans la période) :
 * demande (besoins publiés, places, pourvues, annulées, délai pour trouver), offre (extras,
 * disponibilités), valeur (frais facturables, salaires versés aux extras), qualité, et
 * l'historique des 12 derniers mois.
 */
create function admin_tableau(p_jours integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  depuis timestamptz := now() - make_interval(days => p_jours);
  douze_mois date := (date_trunc('month', jour_reunion()::timestamp) - interval '11 months')::date;
  resultat jsonb;
begin
  perform verifier_admin();
  with
  dem as (
    select d.*, debut_mission(d.jour, d.debut) as commence_le
    from demandes d where d.created_at >= depuis
  ),
  aff as (
    select a.*, d.restaurant_id, d.created_at as publiee_le, d.debut, d.fin, d.jour,
           d.taux_horaire_brut_centimes as taux, d.frais_mise_en_relation_ht_centimes as frais,
           debut_mission(d.jour, d.debut) as commence_le
    from affectations a join demandes d on d.id = a.demande_id
    where d.created_at >= depuis
  ),
  premier as (
    select demande_id, min(created_at) as trouve_le from aff group by demande_id
  ),
  facture as (
    select * from aff where statut in ('confirmee', 'terminee') and commence_le < now()
  )
  select jsonb_build_object(
    'periode_jours', p_jours,
    'demande', jsonb_build_object(
      'demandes', (select count(*) from dem),
      'places', (select coalesce(sum(nb_extras), 0) from dem where statut <> 'annulee'),
      'pourvues', (select count(*) from aff where statut in ('confirmee', 'terminee', 'absente')),
      'annulees', (select count(*) from dem where statut = 'annulee'),
      'en_recherche', (select count(*) from dem where statut = 'publiee' and commence_le > now()),
      'delai_median_minutes', (
        select round(percentile_cont(0.5) within group (order by extract(epoch from p.trouve_le - d.created_at) / 60))
        from premier p join dem d on d.id = p.demande_id),
      'par_poste', coalesce((select jsonb_object_agg(poste, n) from (select poste, count(*) n from dem group by poste) x), '{}'::jsonb)
    ),
    'offre', jsonb_build_object(
      'extras', (select count(*) from extras),
      'nouveaux', (select count(*) from extras where created_at >= depuis),
      'actifs', (select count(distinct extra_id) from aff where statut in ('confirmee', 'terminee')),
      'dispo_7_jours', (select count(distinct extra_id) from disponibilites where jour between jour_reunion() and jour_reunion() + 6),
      'avec_photo', (select count(*) from photos_extras)
    ),
    'etablissements', jsonb_build_object(
      'total', (select count(*) from restaurants),
      'nouveaux', (select count(*) from restaurants where created_at >= depuis),
      'actifs', (select count(distinct restaurant_id) from dem),
      'utilisateurs', (select count(*) from membres)
    ),
    'valeur', jsonb_build_object(
      'frais_ht_centimes', (select coalesce(sum(frais), 0) from facture),
      'tva_centimes', (select coalesce(sum(round(frais * (parametres_en_vigueur(jour)).tva_pour_mille / 1000.0)), 0) from facture),
      'salaires_bruts_centimes', (select coalesce(sum(brut_mission_centimes(debut, fin, taux)), 0) from facture),
      'missions_facturees', (select count(*) from facture),
      'frais_a_venir_ht_centimes', (select coalesce(sum(frais), 0) from aff where statut = 'confirmee' and commence_le >= now())
    ),
    'qualite', jsonb_build_object(
      'note_moyenne', (select round(avg(n.note)::numeric, 2) from notations n join aff a on a.id = n.affectation_id where n.note is not null),
      'notations', (select count(*) from notations n join aff a on a.id = n.affectation_id),
      'absences', (select count(*) from aff where statut = 'absente'),
      'desistements', (select count(*) from aff where statut = 'desistee'),
      'contrats_signes', (select count(*) from contrats c join aff a on a.id = c.affectation_id where c.signe_extra_le is not null and c.signe_restaurant_le is not null)
    ),
    'par_mois', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mois', coalesce(dm.mois, am.mois),
        'demandes', coalesce(dm.demandes, 0),
        'places', coalesce(dm.places, 0),
        'pourvues', coalesce(am.pourvues, 0),
        'frais_ht_centimes', coalesce(am.frais, 0),
        'salaires_bruts_centimes', coalesce(am.salaires, 0)
      ) order by coalesce(dm.mois, am.mois))
      from (
        select to_char(jour, 'YYYY-MM') as mois, count(*) as demandes,
               sum(case when statut <> 'annulee' then nb_extras else 0 end) as places
        from demandes where jour >= douze_mois group by 1
      ) dm
      full join (
        select to_char(d.jour, 'YYYY-MM') as mois,
               count(*) filter (where a.statut in ('confirmee', 'terminee', 'absente')) as pourvues,
               sum(d.frais_mise_en_relation_ht_centimes) filter (
                 where a.statut in ('confirmee', 'terminee') and debut_mission(d.jour, d.debut) < now()) as frais,
               sum(brut_mission_centimes(d.debut, d.fin, d.taux_horaire_brut_centimes)) filter (
                 where a.statut in ('confirmee', 'terminee') and debut_mission(d.jour, d.debut) < now()) as salaires
        from affectations a join demandes d on d.id = a.demande_id
        where d.jour >= douze_mois group by 1
      ) am on am.mois = dm.mois
    ), '[]'::jsonb)
  ) into resultat;
  return resultat;
end $$;

-- Établissements : activité et chiffre d'affaires Kivien de chacun.
create function admin_etablissements()
returns table (id uuid, nom text, commune text, lat double precision, lng double precision, secteur text, siret text,
               telephone text, inscrit_le timestamptz, utilisateurs integer, demandes integer, places_pourvues integer,
               frais_ht_centimes integer, derniere_demande timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select r.id, r.nom, r.commune, r.lat, r.lng, r.secteur, r.siret, r.telephone, r.created_at,
           (select count(*)::integer from membres m where m.restaurant_id = r.id),
           (select count(*)::integer from demandes d where d.restaurant_id = r.id),
           (select count(*)::integer from affectations a join demandes d on d.id = a.demande_id
             where d.restaurant_id = r.id and a.statut in ('confirmee', 'terminee', 'absente')),
           (select coalesce(sum(d.frais_mise_en_relation_ht_centimes), 0)::integer from affectations a join demandes d on d.id = a.demande_id
             where d.restaurant_id = r.id and a.statut in ('confirmee', 'terminee') and debut_mission(d.jour, d.debut) < now()),
           (select max(d.created_at) from demandes d where d.restaurant_id = r.id)
    from restaurants r
    order by r.created_at desc;
end $$;

-- Extras : profil, fiabilité et activité de chacun (le mobile sert au recrutement et au suivi).
create function admin_extras()
returns table (id uuid, prenom text, nom text, telephone text, commune text, competences poste[], experience text,
               a_voiture boolean, inscrit_le timestamptz, missions integer, absences integer, desistements integer,
               note_moyenne numeric, dispo_7_jours boolean, avec_photo boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select e.id, e.prenom, e.nom, e.telephone, e.commune, e.competences, e.experience, e.a_voiture, e.created_at,
           (select count(*)::integer from affectations a where a.extra_id = e.id and a.statut in ('confirmee', 'terminee')),
           (select count(*)::integer from affectations a where a.extra_id = e.id and a.statut = 'absente'),
           (select count(*)::integer from affectations a where a.extra_id = e.id and a.statut = 'desistee'),
           (select round(avg(n.note)::numeric, 1) from notations n join affectations a on a.id = n.affectation_id
             where a.extra_id = e.id and n.note is not null),
           exists (select 1 from disponibilites d where d.extra_id = e.id and d.jour between jour_reunion() and jour_reunion() + 6),
           exists (select 1 from photos_extras p where p.extra_id = e.id)
    from extras e
    order by e.created_at desc;
end $$;

-- Dernières demandes, toutes plateformes confondues, avec leur état et le délai pour trouver.
create function admin_demandes(p_limite integer default 100)
returns table (id uuid, etablissement text, commune text, poste poste, jour date, debut smallint, fin smallint,
               nb_extras smallint, pourvues integer, statut statut_demande, publiee_le timestamptz,
               delai_minutes integer, frais_ht_centimes integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select d.id, r.nom, d.commune, d.poste, d.jour, d.debut, d.fin, d.nb_extras,
           (select count(*)::integer from affectations a where a.demande_id = d.id and a.statut in ('confirmee', 'terminee', 'absente')),
           d.statut, d.created_at,
           (select (extract(epoch from min(a.created_at) - d.created_at) / 60)::integer from affectations a where a.demande_id = d.id),
           d.frais_mise_en_relation_ht_centimes
    from demandes d join restaurants r on r.id = d.restaurant_id
    order by d.created_at desc
    limit least(greatest(p_limite, 1), 500);
end $$;

revoke execute on function verifier_admin(), admin_tableau(integer), admin_etablissements(), admin_extras(), admin_demandes(integer)
  from public, anon;
grant execute on function admin_tableau(integer), admin_etablissements(), admin_extras(), admin_demandes(integer) to authenticated;
