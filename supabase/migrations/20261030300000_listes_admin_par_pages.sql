-- Listes de l'espace admin lues par pages de 1 000 (limite du serveur) : ordre complété par
-- l'identifiant, pour qu'aucune ligne ne soit vue deux fois ni sautée d'une page à l'autre.

create or replace function admin_extras()
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
    order by e.created_at desc, e.id;
end $$;

create or replace function admin_etablissements()
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
    order by r.created_at desc, r.id;
end $$;

create or replace function admin_prospects()
returns table (id uuid, nom text, categorie text, commune text, adresse text, lat double precision, lng double precision,
               telephone text, email text, source_email text, site text, statut text, notes text, desinscrit boolean,
               dernier_envoi timestamptz, envois integer, importe_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select p.id, p.nom, p.categorie, p.commune, p.adresse, p.lat, p.lng, p.telephone, p.email, p.source_email, p.site,
           p.statut, p.notes,
           exists (select 1 from desinscriptions_prospection d where d.email = normaliser_email(p.email)),
           (select max(e.envoye_le) from envois_prospection e where e.prospect_id = p.id),
           (select count(*)::integer from envois_prospection e where e.prospect_id = p.id and e.statut = 'envoye'),
           p.importe_le
    from prospects p
    order by p.nom, p.id;
end $$;
