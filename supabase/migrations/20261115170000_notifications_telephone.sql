-- Notifications sur le téléphone (app Kivien installée depuis l'App Store ou Google Play) : jeton
-- de chaque appareil, envoyé par le VPS (deploy/vps/notifications.sh) en plus de l'e-mail. Un extra
-- sans adresse confirmée reçoit ses alertes sur son téléphone.

create table jetons_push (
  jeton text primary key check (jeton ~ '^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$'),
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  plateforme text not null check (plateforme in ('ios', 'android')),
  cree_le timestamptz not null default now(),
  vu_le timestamptz not null default now()
);
create index jetons_push_utilisateur on jetons_push (utilisateur_id);
alter table jetons_push enable row level security;
revoke all on jetons_push from public, anon, authenticated;

-- Appelée par l'app à chaque ouverture : un appareil appartient au dernier compte connecté.
create function enregistrer_jeton_push(p_jeton text, p_plateforme text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = 'insufficient_privilege';
  end if;
  insert into jetons_push (jeton, utilisateur_id, plateforme) values (p_jeton, auth.uid(), p_plateforme)
  on conflict (jeton) do update set utilisateur_id = excluded.utilisateur_id, plateforme = excluded.plateforme, vu_le = now();
end $$;

-- Téléphone réinitialisé ou app désinstallée (réponse DeviceNotRegistered) : jeton oublié.
create function oublier_jeton_push(p_jeton text) returns void
language sql security definer set search_path = public as $$
  delete from jetons_push where jeton = p_jeton
$$;

revoke execute on function enregistrer_jeton_push(text, text), oublier_jeton_push(text) from public, anon;
grant execute on function enregistrer_jeton_push(text, text) to authenticated;
revoke execute on function oublier_jeton_push(text) from authenticated;

-- File d'envoi : adresse e-mail (si confirmée) et jetons des téléphones de chaque destinataire.
drop function prendre_notifications(integer);
create function prendre_notifications(p_n integer)
returns table (
  id bigint, type text, demande_id uuid, affectation_id uuid, email text, prenom text, prenom_extra text, restaurant text, commune text,
  poste poste, intitule text, jour date, debut smallint, fin smallint, taux_horaire_brut_centimes integer,
  distance_metres integer, jetons text[]
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
  update notifications_email n set statut = 'ignore', erreur = 'Ni adresse e-mail confirmée ni téléphone'
  from auth.users u
  where n.statut = 'en_attente' and u.id = n.destinataire and n.envoyer_apres <= now()
    and (u.email is null or u.email = '' or u.email_confirmed_at is null)
    and not exists (select 1 from jetons_push j where j.utilisateur_id = n.destinataire);
  update notifications_email n set statut = 'ignore', erreur = 'Alertes coupées'
  from extras e
  where n.statut = 'en_attente' and n.type = 'nouvelle_mission' and e.id = n.destinataire and not e.alertes_email;

  return query
  select n.id, n.type, n.demande_id, n.affectation_id, case when u.email_confirmed_at is not null and u.email <> '' then u.email::text end, coalesce(dest.prenom, resp.prenom, ''), coalesce(ex.prenom, ''), r.nom, d.commune,
         d.poste, d.intitule, d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes,
         case when dest.id is not null then distance_metres(dest.lat, dest.lng, d.lat, d.lng) end,
         array(select j.jeton from jetons_push j where j.utilisateur_id = n.destinataire order by j.vu_le desc limit 5)
  from notifications_email n
  join auth.users u on u.id = n.destinataire
  join demandes d on d.id = n.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join extras dest on dest.id = n.destinataire
  left join responsables resp on resp.utilisateur_id = n.destinataire
  left join affectations a on a.id = n.affectation_id
  left join extras ex on ex.id = a.extra_id
  where n.statut = 'en_attente' and n.envoyer_apres <= now()
  order by n.envoyer_apres, n.id
  limit greatest(p_n, 0);
end $$;
revoke execute on function prendre_notifications(integer) from public, anon, authenticated;
