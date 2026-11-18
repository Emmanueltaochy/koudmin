-- DPAE automatique : Kivien déclare l'embauche à l'Urssaf pour l'établissement qui lui en a donné
-- mandat (API DPAE de l'Urssaf, envoi par le VPS : deploy/vps/dpae.sh, toutes les 5 minutes).
-- Désactivée par défaut (reglages_dpae.actif) : tant qu'elle l'est, rien ne change dans l'espace
-- pro et l'établissement fait sa DPAE lui-même, comme avant.

create table reglages_dpae (
  id smallint primary key default 1 check (id = 1),
  actif boolean not null default false,
  maj_le timestamptz not null default now()
);
insert into reglages_dpae default values;
alter table reglages_dpae enable row level security;
revoke all on reglages_dpae from anon, authenticated;

-- L'espace pro ne propose le mandat que si l'envoi automatique est ouvert.
create function dpae_auto_active() returns boolean
language sql stable security definer set search_path = public as $$
  select actif from reglages_dpae where id = 1
$$;
revoke execute on function dpae_auto_active() from public, anon;
grant execute on function dpae_auto_active() to authenticated;

-- ---------------------------------------------------------------------------
-- Mandat : l'établissement charge Kivien de faire ses DPAE. Donné et retiré par un gérant.
-- Le code APE et le service de santé au travail sont demandés par l'Urssaf dans chaque DPAE.
-- ---------------------------------------------------------------------------
create table mandats_dpae (
  restaurant_id uuid primary key references restaurants (id) on delete cascade,
  code_ape text not null check (code_ape ~ '^[0-9]{4}[A-Z]$'),
  service_sante text not null check (service_sante ~ '^[A-Z0-9]{1,10}$'),
  accepte_par uuid references auth.users (id) on delete set null,
  accepte_le timestamptz not null default now()
);
alter table mandats_dpae enable row level security;
create policy "membre : mandat de ses établissements" on mandats_dpae for select to authenticated
  using (restaurant_id in (select mes_restaurants()));
revoke all on mandats_dpae from anon;
revoke insert, update, delete on mandats_dpae from authenticated;

create function donner_mandat_dpae(p_restaurant uuid, p_code_ape text, p_service_sante text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ape text := upper(replace(replace(btrim(coalesce(p_code_ape, '')), '.', ''), ' ', ''));
  v_sante text := upper(replace(btrim(coalesce(p_service_sante, '')), ' ', ''));
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant de l''établissement' using errcode = '42501';
  end if;
  if not dpae_auto_active() then
    raise exception 'La DPAE automatique n''est pas encore ouverte';
  end if;
  if v_ape !~ '^[0-9]{4}[A-Z]$' then
    raise exception 'Code APE invalide';
  end if;
  if v_sante !~ '^[A-Z0-9]{1,10}$' then
    raise exception 'Code du service de santé au travail invalide';
  end if;
  insert into mandats_dpae (restaurant_id, code_ape, service_sante, accepte_par)
  values (p_restaurant, v_ape, v_sante, auth.uid())
  on conflict (restaurant_id) do update
    set code_ape = excluded.code_ape, service_sante = excluded.service_sante,
        accepte_par = excluded.accepte_par, accepte_le = now();
end $$;

create function retirer_mandat_dpae(p_restaurant uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_gerant(p_restaurant) then
    raise exception 'Réservé au gérant de l''établissement' using errcode = '42501';
  end if;
  delete from mandats_dpae where restaurant_id = p_restaurant;
  -- Les DPAE pas encore parties ne partiront pas : l'établissement les fait lui-même.
  delete from dpae x using affectations a, demandes d
   where x.affectation_id = a.id and d.id = a.demande_id and d.restaurant_id = p_restaurant
     and x.statut = 'a_envoyer';
end $$;
revoke execute on function donner_mandat_dpae(uuid, text, text), retirer_mandat_dpae(uuid) from public, anon;
grant execute on function donner_mandat_dpae(uuid, text, text), retirer_mandat_dpae(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Une DPAE par embauche (affectation).
--   a_envoyer  : en attente (signature de l'extra, ou prochain passage du serveur)
--   envoyee    : déposée à l'Urssaf, accusé de réception attendu
--   acceptee   : accusé de réception reçu (référence du dossier)
--   refusee    : rejetée par l'Urssaf ; a_faire : impossible à envoyer (information manquante,
--                délai dépassé, panne) : dans les deux cas l'établissement la fait lui-même
--   a_annuler  : envoyée, puis l'extra s'est désisté
-- ---------------------------------------------------------------------------
create table dpae (
  affectation_id uuid primary key references affectations (id) on delete cascade,
  statut text not null default 'a_envoyer'
    check (statut in ('a_envoyer', 'envoyee', 'acceptee', 'refusee', 'a_faire', 'a_annuler')),
  motif text,
  id_flux text,
  reference text,
  accuse text,
  tentatives integer not null default 0,
  envoyee_le timestamptz,
  repondue_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index dpae_en_cours on dpae (statut) where statut in ('a_envoyer', 'envoyee');
alter table dpae enable row level security;
create policy "établissement : ses DPAE" on dpae for select to authenticated
  using (partie_au_contrat(affectation_id) = 'restaurant');
revoke all on dpae from anon;
revoke insert, update, delete on dpae from authenticated;

-- E-mail à l'équipe quand une DPAE ne peut pas partir toute seule.
alter table notifications_email drop constraint notifications_email_type_check;
alter table notifications_email add constraint notifications_email_type_check
  check (type in ('nouvelle_mission', 'extra_trouve', 'contrat_a_signer', 'rappel_extra', 'rappel_pro', 'dpae_a_faire'));

create function prevenir_dpae_a_faire(p_affectation uuid) returns void
language sql security definer set search_path = public as $$
  insert into notifications_email (type, destinataire, demande_id, affectation_id, cle)
  select 'dpae_a_faire', m.utilisateur_id, a.demande_id, a.id, 'dpae_a_faire:' || a.id || ':' || m.utilisateur_id
  from affectations a join demandes d on d.id = a.demande_id
  join membres m on m.restaurant_id = d.restaurant_id
  where a.id = p_affectation and a.statut = 'confirmee'
  on conflict (cle) do nothing
$$;
revoke execute on function prevenir_dpae_a_faire(uuid) from public, anon, authenticated;

-- Passe une DPAE en « à faire par l'établissement » et prévient l'équipe.
create function dpae_a_faire(p_affectation uuid, p_motif text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update dpae set statut = 'a_faire', motif = p_motif, maj_le = now()
   where affectation_id = p_affectation and statut = 'a_envoyer';
  if found then
    perform prevenir_dpae_a_faire(p_affectation);
  end if;
end $$;
revoke execute on function dpae_a_faire(uuid, text) from public, anon, authenticated;

/*
 * Appelée par le serveur : met la file à jour, puis renvoie les DPAE prêtes à partir.
 * Une DPAE part quand l'extra a signé son contrat (il s'est engagé), ou au plus tard 3 heures
 * avant le début. Jamais plus de 8 jours avant, jamais après le début de la mission.
 * Sans numéro de sécurité sociale (il donne le sexe et le département de naissance, exigés par
 * l'Urssaf), l'envoi automatique est impossible : l'établissement est prévenu.
 */
create function prendre_dpae(p_n integer)
returns table (
  affectation_id uuid, siret text, raison_sociale text, adresse text, code_postal text, commune text,
  telephone text, code_ape text, service_sante text, nom text, prenom text, nir text,
  date_naissance date, lieu_naissance text, jour date, debut smallint, fin smallint
)
language plpgsql security definer set search_path = public as $$
declare
  l record;
begin
  if not dpae_auto_active() then
    return;
  end if;

  -- Nouvelles embauches des établissements sous mandat.
  insert into dpae (affectation_id)
  select a.id
  from affectations a
  join demandes d on d.id = a.demande_id
  join mandats_dpae m on m.restaurant_id = d.restaurant_id
  where a.statut = 'confirmee'
    and debut_mission(d.jour, d.debut) > now()
    and debut_mission(d.jour, d.debut) <= now() + interval '8 days'
    -- Les embauches d'avant le mandat restent à la charge de l'établissement.
    and a.created_at >= m.accepte_le
  on conflict do nothing;

  -- L'extra s'est désisté : rien à envoyer, ou une DPAE déjà partie à annuler.
  delete from dpae x using affectations a
   where a.id = x.affectation_id and a.statut = 'desistee' and x.statut in ('a_envoyer', 'a_faire');
  update dpae x set statut = 'a_annuler', maj_le = now(),
         motif = 'L''extra s''est désisté après l''envoi de la DPAE.'
    from affectations a
   where a.id = x.affectation_id and a.statut = 'desistee' and x.statut in ('envoyee', 'acceptee');

  for l in
    select x.affectation_id, x.tentatives, debut_mission(d.jour, d.debut) as debut_le,
           c.signe_extra_le is not null as signe, i.extra_id is not null as infos, i.nir,
           r.siret, coalesce(r.adresse, d.adresse) as adresse, coalesce(r.code_postal, d.code_postal) as code_postal
    from dpae x
    join affectations a on a.id = x.affectation_id
    join demandes d on d.id = a.demande_id
    join restaurants r on r.id = d.restaurant_id
    left join contrats c on c.affectation_id = a.id
    left join infos_contrat i on i.extra_id = a.extra_id
    where x.statut = 'a_envoyer'
  loop
    if l.debut_le <= now() then
      perform dpae_a_faire(l.affectation_id, 'La mission a commencé avant l''envoi de la DPAE.');
    elsif l.siret is null or l.adresse is null or l.code_postal is null then
      perform dpae_a_faire(l.affectation_id, 'Le SIRET ou l''adresse de l''établissement manque.');
    elsif l.infos and l.nir is null then
      perform dpae_a_faire(l.affectation_id, 'L''extra n''a pas indiqué son numéro de sécurité sociale.');
    elsif not l.infos and l.debut_le <= now() + interval '3 hours' then
      perform dpae_a_faire(l.affectation_id, 'L''extra n''a pas encore rempli ses informations de contrat.');
    elsif l.tentatives >= 5 and l.debut_le <= now() + interval '3 hours' then
      perform dpae_a_faire(l.affectation_id, 'Le service de l''Urssaf ne répond pas.');
    end if;
  end loop;

  return query
  select x.affectation_id, r.siret, r.nom, coalesce(r.adresse, d.adresse), coalesce(r.code_postal, d.code_postal),
         coalesce(r.commune, d.commune), r.telephone, m.code_ape, m.service_sante,
         e.nom, e.prenom, i.nir, i.date_naissance, i.lieu_naissance, d.jour, d.debut, d.fin
  from dpae x
  join affectations a on a.id = x.affectation_id
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  join mandats_dpae m on m.restaurant_id = r.id
  join extras e on e.id = a.extra_id
  join infos_contrat i on i.extra_id = e.id
  left join contrats c on c.affectation_id = a.id
  where x.statut = 'a_envoyer' and a.statut = 'confirmee' and i.nir is not null
    and (c.signe_extra_le is not null or debut_mission(d.jour, d.debut) <= now() + interval '3 hours')
    -- Après un échec, on attend avant de réessayer : 15 minutes de plus à chaque fois, 2 heures au plus.
    and (x.tentatives = 0 or x.maj_le <= now() - make_interval(mins => least(x.tentatives * 15, 120)))
  order by debut_mission(d.jour, d.debut), x.affectation_id
  limit greatest(p_n, 0);
end $$;

-- Résultat d'un passage : 'envoyee' (dépôt accepté), 'acceptee', 'refusee', ou 'echec' (panne :
-- la DPAE reste à envoyer et sera retentée).
create function noter_dpae(p_affectation uuid, p_resultat text, p_id_flux text default null,
                           p_reference text default null, p_accuse text default null, p_motif text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_resultat = 'envoyee' then
    update dpae set statut = 'envoyee', id_flux = p_id_flux, envoyee_le = now(), motif = null,
           tentatives = tentatives + 1, maj_le = now()
     where affectation_id = p_affectation and statut = 'a_envoyer';
  elsif p_resultat = 'acceptee' then
    update dpae set statut = 'acceptee', reference = p_reference, accuse = left(p_accuse, 8000), motif = null,
           repondue_le = now(), maj_le = now()
     where affectation_id = p_affectation and statut = 'envoyee';
  elsif p_resultat = 'refusee' then
    update dpae set statut = 'refusee', motif = left(p_motif, 500), accuse = left(p_accuse, 8000),
           id_flux = coalesce(p_id_flux, id_flux), repondue_le = now(), maj_le = now()
     where affectation_id = p_affectation and statut in ('a_envoyer', 'envoyee');
    if found then
      perform prevenir_dpae_a_faire(p_affectation);
    end if;
  elsif p_resultat = 'echec' then
    update dpae set tentatives = tentatives + 1, motif = left(p_motif, 500), maj_le = now()
     where affectation_id = p_affectation and statut = 'a_envoyer';
  else
    raise exception 'Résultat inconnu : %', p_resultat;
  end if;
end $$;

-- DPAE déposées dont l'accusé de réception est attendu.
create function dpae_envoyees()
returns table (affectation_id uuid, id_flux text)
language sql stable security definer set search_path = public as $$
  select x.affectation_id, x.id_flux from dpae x
  where x.statut = 'envoyee' and x.id_flux is not null and x.envoyee_le > now() - interval '15 days'
  order by x.envoyee_le
$$;
revoke execute on function prendre_dpae(integer), noter_dpae(uuid, text, text, text, text, text), dpae_envoyees()
  from public, anon, authenticated;

-- Espace pro, page du contrat : où en est la DPAE de cette embauche. « prevue » : Kivien s'en charge
-- (mandat donné avant l'embauche, mission pas commencée), même si rien n'est encore parti.
create function etat_dpae(p_affectation uuid)
returns table (ouverte boolean, mandat boolean, prevue boolean, statut text, motif text, reference text,
               envoyee_le timestamptz)
language sql stable security definer set search_path = public as $$
  select dpae_auto_active(), m.restaurant_id is not null,
         dpae_auto_active() and m.restaurant_id is not null and a.created_at >= m.accepte_le
           and a.statut = 'confirmee' and debut_mission(d.jour, d.debut) > now(),
         x.statut, x.motif, x.reference, x.envoyee_le
  from affectations a
  join demandes d on d.id = a.demande_id
  left join mandats_dpae m on m.restaurant_id = d.restaurant_id
  left join dpae x on x.affectation_id = a.id
  where a.id = p_affectation and partie_au_contrat(p_affectation) = 'restaurant'
$$;
revoke execute on function etat_dpae(uuid) from public, anon;
grant execute on function etat_dpae(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Espace admin : interrupteur, compteurs et dernières DPAE.
-- ---------------------------------------------------------------------------
create function admin_reglages_dpae()
returns table (actif boolean, mandats integer, a_envoyer integer, envoyees integer, acceptees integer, a_reprendre integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select r.actif,
           (select count(*)::integer from mandats_dpae),
           (select count(*)::integer from dpae where statut = 'a_envoyer'),
           (select count(*)::integer from dpae where statut = 'envoyee'),
           (select count(*)::integer from dpae where statut = 'acceptee'),
           (select count(*)::integer from dpae where statut in ('refusee', 'a_faire', 'a_annuler'))
    from reglages_dpae r where r.id = 1;
end $$;

create function admin_regler_dpae(p_actif boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin();
  update reglages_dpae set actif = p_actif, maj_le = now() where id = 1;
end $$;

create function admin_dpae(p_limite integer default 50)
returns table (affectation_id uuid, restaurant text, extra text, jour date, statut text, motif text,
               reference text, maj_le timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select x.affectation_id, r.nom, btrim(e.prenom || ' ' || e.nom), d.jour, x.statut, x.motif, x.reference, x.maj_le
    from dpae x
    join affectations a on a.id = x.affectation_id
    join demandes d on d.id = a.demande_id
    join restaurants r on r.id = d.restaurant_id
    join extras e on e.id = a.extra_id
    order by x.maj_le desc
    limit least(greatest(p_limite, 1), 200);
end $$;
revoke execute on function admin_reglages_dpae(), admin_regler_dpae(boolean), admin_dpae(integer) from public, anon;
grant execute on function admin_reglages_dpae(), admin_regler_dpae(boolean), admin_dpae(integer) to authenticated;
