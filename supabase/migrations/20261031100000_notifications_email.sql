-- E-mails automatiques, envoyés par le VPS (deploy/vps/notifications.sh, chaque minute) :
--   nouvelle_mission : aux extras proches et disponibles quand une mission est publiée
--                      (les favoris de l'établissement d'abord, les autres 5 minutes après) ;
--   extra_trouve     : à l'équipe de l'établissement quand un extra accepte (contrat à signer) ;
--   contrat_a_signer : à l'extra quand l'établissement a signé et qu'il reste sa signature ;
--   rappel_extra, rappel_pro : la veille de la mission, à partir de 17 h (heure de La Réunion).
-- Seules les adresses confirmées reçoivent un message. La file n'est lue que par le serveur.

alter table extras add column alertes_email boolean not null default true;

create table notifications_email (
  id bigint generated always as identity primary key,
  type text not null check (type in ('nouvelle_mission', 'extra_trouve', 'contrat_a_signer', 'rappel_extra', 'rappel_pro')),
  destinataire uuid not null references auth.users (id) on delete cascade,
  demande_id uuid not null references demandes (id) on delete cascade,
  affectation_id uuid references affectations (id) on delete cascade,
  -- Un même message n'est jamais mis deux fois dans la file.
  cle text not null unique,
  envoyer_apres timestamptz not null default now(),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'envoye', 'ignore', 'echoue')),
  envoye_le timestamptz,
  erreur text,
  cree_le timestamptz not null default now()
);
create index notifications_a_envoyer on notifications_email (envoyer_apres) where statut = 'en_attente';
alter table notifications_email enable row level security;
revoke all on notifications_email from public, anon, authenticated;

-- Rayon d'alerte : 30 km avec une voiture, 15 km sans.
create function rayon_alerte_metres(p_a_voiture boolean) returns integer
language sql immutable as $$ select case when p_a_voiture then 30000 else 15000 end $$;

-- Créneau de la mission, comme dans l'onglet Dispos : midi avant 15 h, soir ensuite.
create function creneau_mission(p_debut smallint) returns text
language sql immutable as $$ select case when p_debut < 900 then 'midi' else 'soir' end $$;

-- Mission publiée : extras proches, alertes activées, disponibles sur le créneau (ou sans aucune
-- disponibilité renseignée), au plus les 200 plus proches.
create function alerter_extras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut <> 'publiee' or debut_mission(new.jour, new.debut) <= now() then
    return null;
  end if;
  insert into notifications_email (type, destinataire, demande_id, cle, envoyer_apres)
  select 'nouvelle_mission', e.id, new.id, 'nouvelle_mission:' || new.id || ':' || e.id,
         case when exists (select 1 from favoris f where f.restaurant_id = new.restaurant_id and f.extra_id = e.id)
              then now() else now() + interval '5 minutes' end
  from extras e
  where e.alertes_email
    and distance_metres(e.lat, e.lng, new.lat, new.lng) <= rayon_alerte_metres(e.a_voiture)
    and (
      exists (select 1 from disponibilites d where d.extra_id = e.id and d.jour = new.jour
              and d.creneau = creneau_mission(new.debut))
      or not exists (select 1 from disponibilites d where d.extra_id = e.id and d.jour >= jour_reunion())
    )
  order by distance_metres(e.lat, e.lng, new.lat, new.lng)
  limit 200
  on conflict (cle) do nothing;
  return null;
end $$;
create trigger alerter_extras after insert on demandes for each row execute function alerter_extras();

-- Extra trouvé : chaque membre de l'établissement est prévenu (le contrat est à signer).
create function prevenir_extra_trouve() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut <> 'confirmee' then
    return null;
  end if;
  insert into notifications_email (type, destinataire, demande_id, affectation_id, cle)
  select 'extra_trouve', m.utilisateur_id, new.demande_id, new.id, 'extra_trouve:' || new.id || ':' || m.utilisateur_id
  from demandes d join membres m on m.restaurant_id = d.restaurant_id
  where d.id = new.demande_id
  on conflict (cle) do nothing;
  return null;
end $$;
create trigger prevenir_extra_trouve after insert or update of statut on affectations
  for each row execute function prevenir_extra_trouve();

-- L'établissement a signé, l'extra pas encore : on le lui rappelle.
create function prevenir_contrat_a_signer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.signe_restaurant_le is null or new.signe_extra_le is not null then
    return null;
  end if;
  insert into notifications_email (type, destinataire, demande_id, affectation_id, cle)
  select 'contrat_a_signer', a.extra_id, a.demande_id, a.id, 'contrat_a_signer:' || a.id
  from affectations a where a.id = new.affectation_id and a.statut = 'confirmee'
  on conflict (cle) do nothing;
  return null;
end $$;
create trigger prevenir_contrat_a_signer after insert or update of signe_restaurant_le on contrats
  for each row execute function prevenir_contrat_a_signer();

-- Rappels de la veille (appelée par le VPS à chaque passage, sans effet avant 17 h).
create function programmer_rappels() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if extract(hour from now() at time zone 'Indian/Reunion') < 17 then
    return 0;
  end if;
  with a_venir as (
    select a.id, a.extra_id, a.demande_id, d.restaurant_id
    from affectations a join demandes d on d.id = a.demande_id
    where a.statut = 'confirmee' and d.statut in ('publiee', 'pourvue') and d.jour = jour_reunion() + 1
  ),
  ajoutes as (
    insert into notifications_email (type, destinataire, demande_id, affectation_id, cle)
    select 'rappel_extra', v.extra_id, v.demande_id, v.id, 'rappel_extra:' || v.id from a_venir v
    union all
    select 'rappel_pro', m.utilisateur_id, v.demande_id, v.id, 'rappel_pro:' || v.id || ':' || m.utilisateur_id
    from a_venir v join membres m on m.restaurant_id = v.restaurant_id
    on conflict (cle) do nothing
    returning 1
  )
  select count(*)::integer into n from ajoutes;
  return n;
end $$;

-- Lot à envoyer. Les messages devenus inutiles (mission pourvue, annulée ou commencée, extra
-- désisté, contrat déjà signé, pas d'adresse confirmée) sont écartés avant l'envoi.
create function prendre_notifications(p_n integer)
returns table (
  id bigint, type text, demande_id uuid, affectation_id uuid, email text, prenom text, prenom_extra text, restaurant text, commune text,
  poste poste, intitule text, jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  distance_metres integer
)
language plpgsql security definer set search_path = public as $$
begin
  update notifications_email n set statut = 'ignore', erreur = 'Plus d''actualité'
  from demandes d
  where n.statut = 'en_attente' and d.id = n.demande_id and n.envoyer_apres <= now()
    and (
      (n.type = 'nouvelle_mission' and (d.statut <> 'publiee' or debut_mission(d.jour, d.debut) <= now()
        or exists (select 1 from affectations a where a.demande_id = d.id and a.extra_id = n.destinataire)))
      or (n.type <> 'nouvelle_mission' and not exists (
        select 1 from affectations a where a.id = n.affectation_id and a.statut = 'confirmee'))
      or (n.type = 'contrat_a_signer' and exists (
        select 1 from contrats c where c.affectation_id = n.affectation_id and c.signe_extra_le is not null))
      or (n.type <> 'nouvelle_mission' and d.statut not in ('publiee', 'pourvue'))
    );
  update notifications_email n set statut = 'ignore', erreur = 'Pas d''adresse e-mail confirmée'
  from auth.users u
  where n.statut = 'en_attente' and u.id = n.destinataire and n.envoyer_apres <= now()
    and (u.email is null or u.email = '' or u.email_confirmed_at is null);
  update notifications_email n set statut = 'ignore', erreur = 'Alertes coupées'
  from extras e
  where n.statut = 'en_attente' and n.type = 'nouvelle_mission' and e.id = n.destinataire and not e.alertes_email;

  return query
  select n.id, n.type, n.demande_id, n.affectation_id, u.email::text, coalesce(dest.prenom, ''), coalesce(ex.prenom, ''), r.nom, d.commune,
         d.poste, d.intitule, d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes,
         case when dest.id is not null then distance_metres(dest.lat, dest.lng, d.lat, d.lng) end
  from notifications_email n
  join auth.users u on u.id = n.destinataire
  join demandes d on d.id = n.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join extras dest on dest.id = n.destinataire
  left join affectations a on a.id = n.affectation_id
  left join extras ex on ex.id = a.extra_id
  where n.statut = 'en_attente' and n.envoyer_apres <= now()
  order by n.envoyer_apres, n.id
  limit greatest(p_n, 0);
end $$;

create function noter_notification(p_id bigint, p_erreur text default null) returns void
language sql security definer set search_path = public as $$
  update notifications_email
     set statut = case when p_erreur is null then 'envoye' else 'echoue' end,
         envoye_le = case when p_erreur is null then now() end,
         erreur = left(p_erreur, 300)
   where id = p_id
$$;

revoke execute on function alerter_extras(), prevenir_extra_trouve(), prevenir_contrat_a_signer(),
  programmer_rappels(), prendre_notifications(integer), noter_notification(bigint, text)
  from public, anon, authenticated;
