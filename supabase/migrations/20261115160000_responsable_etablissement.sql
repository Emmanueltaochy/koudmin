-- Prénom et nom des personnes qui gèrent un établissement (demandés à l'inscription, ou dans
-- l'espace pour les comptes déjà ouverts). Repris dans le contrat (« représenté par »), les
-- e-mails, l'équipe de l'établissement et l'espace admin.

create table responsables (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  prenom text not null check (length(btrim(prenom)) between 1 and 60),
  nom text not null check (length(btrim(nom)) between 1 and 60),
  maj_le timestamptz not null default now()
);
alter table responsables enable row level security;
create policy "responsable : sa fiche" on responsables for select to authenticated using (utilisateur_id = auth.uid());
revoke all on responsables from anon;

create function noter_responsable(p_prenom text, p_nom text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_prenom, ''))) = 0 or length(btrim(coalesce(p_nom, ''))) = 0 then
    raise exception 'Prénom et nom obligatoires';
  end if;
  insert into responsables (utilisateur_id, prenom, nom)
  values (auth.uid(), left(btrim(p_prenom), 60), left(btrim(p_nom), 60))
  on conflict (utilisateur_id) do update set prenom = excluded.prenom, nom = excluded.nom, maj_le = now();
end $$;

create function nom_responsable(p_utilisateur uuid) returns text
language sql stable security definer set search_path = public as $$
  select prenom || ' ' || nom from responsables where utilisateur_id = p_utilisateur
$$;
revoke execute on function nom_responsable(uuid) from public, anon, authenticated;

-- Contrat : nom de la personne qui signe pour l'établissement, figé à la signature.
alter table contrats add column signataire_restaurant text;

create function noter_signataire() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.signe_restaurant_le is not null and old.signe_restaurant_le is null then
    new.signataire_restaurant := nom_responsable(auth.uid());
  end if;
  return new;
end $$;
create trigger noter_signataire before update of signe_restaurant_le on contrats
  for each row execute function noter_signataire();

-- Représentant de l'établissement pour une affectation : le signataire, sinon le premier gérant nommé.
create function representant(p_affectation uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select c.signataire_restaurant from contrats c where c.affectation_id = p_affectation),
    (select nom_responsable(m.utilisateur_id)
       from affectations a join demandes d on d.id = a.demande_id
       join membres m on m.restaurant_id = d.restaurant_id
      where a.id = p_affectation and nom_responsable(m.utilisateur_id) is not null
      order by (m.role = 'gerant') desc, m.created_at limit 1)
  )
$$;
revoke execute on function representant(uuid) from public, anon;
grant execute on function representant(uuid) to authenticated;

-- App extra : le contrat indique qui représente l'établissement.
drop function contrat_extra(uuid);
create function contrat_extra(p_demande uuid)
returns table (
  affectation_id uuid, employeur text, adresse_employeur text, siret text, secteur text,
  signe_extra boolean, signe_restaurant boolean, representant text
)
language sql stable security definer set search_path = public as $$
  select a.id, r.nom,
         concat_ws(', ', coalesce(r.adresse, d.adresse), concat_ws(' ', coalesce(r.code_postal, d.code_postal), coalesce(r.commune, d.commune))),
         r.siret, r.secteur,
         coalesce(c.signe_extra_le is not null, false),
         coalesce(c.signe_restaurant_le is not null, false),
         representant(a.id)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join contrats c on c.affectation_id = a.id
  where a.demande_id = p_demande and a.extra_id = auth.uid() and a.statut = 'confirmee'
$$;
revoke execute on function contrat_extra(uuid) from public, anon;
grant execute on function contrat_extra(uuid) to authenticated;

-- Équipe de l'établissement : prénom et nom de chaque membre.
drop function equipe_etablissement(uuid);
create function equipe_etablissement(p_restaurant uuid)
returns table (utilisateur_id uuid, telephone text, role role_membre, en_attente boolean, moi boolean, nom text)
language sql stable security definer set search_path = public as $$
  select m.utilisateur_id, '+' || u.phone, m.role, false, m.utilisateur_id = auth.uid(), nom_responsable(m.utilisateur_id)
  from membres m join auth.users u on u.id = m.utilisateur_id
  where m.restaurant_id = p_restaurant and p_restaurant in (select mes_restaurants())
  union all
  select null, i.telephone, i.role, true, false, null
  from invitations i
  where i.restaurant_id = p_restaurant and p_restaurant in (select mes_restaurants())
  order by 4, 3, 2
$$;
revoke execute on function equipe_etablissement(uuid) from public, anon;
grant execute on function equipe_etablissement(uuid) to authenticated;

-- Admin : responsable de chaque établissement (premier gérant nommé).
create function admin_responsables()
returns table (restaurant_id uuid, responsable text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select distinct on (m.restaurant_id) m.restaurant_id, nom_responsable(m.utilisateur_id)
    from membres m
    where nom_responsable(m.utilisateur_id) is not null
    order by m.restaurant_id, (m.role = 'gerant') desc, m.created_at;
end $$;
revoke execute on function admin_responsables() from public, anon;
grant execute on function admin_responsables() to authenticated;

-- E-mails aux établissements : « Bonjour Marie, » quand le prénom est connu.
create or replace function prendre_notifications(p_n integer)
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
  select n.id, n.type, n.demande_id, n.affectation_id, u.email::text, coalesce(dest.prenom, resp.prenom, ''), coalesce(ex.prenom, ''), r.nom, d.commune,
         d.poste, d.intitule, d.jour, d.debut, d.fin, d.taux_horaire_brut_centimes,
         case when dest.id is not null then distance_metres(dest.lat, dest.lng, d.lat, d.lng) end
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
