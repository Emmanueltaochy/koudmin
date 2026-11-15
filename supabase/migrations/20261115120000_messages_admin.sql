-- Messages écrits depuis l'espace admin (onglet Messages) aux extras ou aux établissements qui ont
-- une adresse e-mail confirmée. Envoyés par le VPS (deploy/vps/notifications.sh, chaque minute)
-- depuis la boîte de Kivien. {prenom} dans le message est remplacé par le prénom de l'extra.

create table messages_admin (
  id uuid primary key default gen_random_uuid(),
  public text not null check (public in ('extras', 'etablissements')),
  sujet text not null check (length(btrim(sujet)) between 3 and 150),
  message text not null check (length(btrim(message)) between 20 and 5000),
  cree_par uuid references auth.users (id) on delete set null,
  cree_le timestamptz not null default now()
);

create table envois_admin (
  id bigint generated always as identity primary key,
  message_id uuid not null references messages_admin (id) on delete cascade,
  utilisateur_id uuid references auth.users (id) on delete set null,
  email text not null,
  prenom text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'envoye', 'echoue')),
  envoye_le timestamptz,
  erreur text,
  unique (message_id, utilisateur_id)
);
create index envois_admin_a_envoyer on envois_admin (id) where statut = 'en_attente';

alter table messages_admin enable row level security;
alter table envois_admin enable row level security;
revoke all on messages_admin, envois_admin from public, anon, authenticated;

-- Adresse confirmée d'un compte (null sinon).
create function email_confirme(p_utilisateur uuid) returns text
language sql stable security definer set search_path = public as $$
  select u.email::text from auth.users u
  where u.id = p_utilisateur and u.email is not null and u.email <> '' and u.email_confirmed_at is not null
$$;
revoke execute on function email_confirme(uuid) from public, anon, authenticated;

-- Destinataires possibles : tous les extras, ou tous les utilisateurs des établissements, avec leur
-- adresse confirmée (null : pas d'adresse, pas d'envoi possible).
create function admin_destinataires(p_public text)
returns table (utilisateur_id uuid, nom text, detail text, prenom text, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  if p_public = 'extras' then
    return query
      select e.id, e.prenom || ' ' || e.nom, e.commune, e.prenom, email_confirme(e.id)
      from extras e order by e.created_at desc, e.id;
  elsif p_public = 'etablissements' then
    return query
      select x.utilisateur_id, x.nom, x.detail, null::text, email_confirme(x.utilisateur_id)
      from (
        select distinct on (m.utilisateur_id) m.utilisateur_id, r.nom, r.commune as detail, r.created_at
        from membres m join restaurants r on r.id = m.restaurant_id
        order by m.utilisateur_id, (m.role = 'gerant') desc, r.created_at
      ) x
      order by x.created_at desc, x.utilisateur_id;
  else
    raise exception 'Public inconnu';
  end if;
end $$;

-- Programme un message : un envoi par destinataire choisi qui a une adresse confirmée.
create function admin_envoyer_message(p_public text, p_sujet text, p_message text, p_utilisateurs uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
  n integer;
begin
  perform verifier_admin();
  insert into messages_admin (public, sujet, message, cree_par)
  values (p_public, btrim(p_sujet), btrim(p_message), auth.uid()) returning id into m;
  insert into envois_admin (message_id, utilisateur_id, email, prenom)
  select m, d.utilisateur_id, d.email, d.prenom
  from admin_destinataires(p_public) d
  where d.utilisateur_id = any (p_utilisateurs) and d.email is not null;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Aucun destinataire avec une adresse confirmée';
  end if;
  return n;
end $$;

create function admin_messages()
returns table (id uuid, public text, sujet text, cree_le timestamptz, total integer, envoyes integer,
               en_attente integer, echecs integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select m.id, m.public, m.sujet, m.cree_le,
           count(e.id)::integer,
           count(e.id) filter (where e.statut = 'envoye')::integer,
           count(e.id) filter (where e.statut = 'en_attente')::integer,
           count(e.id) filter (where e.statut = 'echoue')::integer
    from messages_admin m left join envois_admin e on e.message_id = m.id
    group by m.id
    order by m.cree_le desc;
end $$;

-- Lot à envoyer (serveur seulement).
create function prendre_envois_admin(p_n integer)
returns table (id bigint, email text, prenom text, public text, sujet text, message text)
language sql stable security definer set search_path = public as $$
  select e.id, e.email, coalesce(e.prenom, ''), m.public, m.sujet, m.message
  from envois_admin e join messages_admin m on m.id = e.message_id
  where e.statut = 'en_attente'
  order by e.id
  limit greatest(p_n, 0)
$$;

create function noter_envoi_admin(p_id bigint, p_erreur text default null) returns void
language sql security definer set search_path = public as $$
  update envois_admin
     set statut = case when p_erreur is null then 'envoye' else 'echoue' end,
         envoye_le = case when p_erreur is null then now() end,
         erreur = left(p_erreur, 300)
   where id = p_id
$$;

revoke execute on function admin_destinataires(text), admin_envoyer_message(text, text, text, uuid[]), admin_messages(),
  prendre_envois_admin(integer), noter_envoi_admin(bigint, text) from public, anon;
grant execute on function admin_destinataires(text), admin_envoyer_message(text, text, text, uuid[]), admin_messages()
  to authenticated;
revoke execute on function prendre_envois_admin(integer), noter_envoi_admin(bigint, text) from authenticated;
