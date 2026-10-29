-- Étape e : adresse du restaurant, TVA, contrats et signatures, informations pour la DPAE,
-- notation, favoris, disponibilités, factures.

-- ---------------------------------------------------------------------------
-- Paramètres : TVA sur les frais Koudmin (La Réunion : 8,5 %).
-- ---------------------------------------------------------------------------
alter table parametres add column tva_pour_mille integer not null default 85
  check (tva_pour_mille between 0 and 1000);

-- ---------------------------------------------------------------------------
-- Restaurant : adresse habituelle (préremplit les demandes).
-- ---------------------------------------------------------------------------
alter table restaurants
  add column adresse text,
  add column code_postal text,
  add column commune text,
  add column lat double precision,
  add column lng double precision;

-- ---------------------------------------------------------------------------
-- Extra : nom de famille (contrat) ; informations administratives à part, demandées
-- à la première signature, jamais à l'inscription (5 champs maximum).
-- ---------------------------------------------------------------------------
alter table extras add column nom text not null default '';

create table infos_contrat (
  extra_id uuid primary key references extras (id) on delete cascade,
  date_naissance date not null,
  lieu_naissance text not null,
  -- Numéro de sécurité sociale : requis pour la DPAE. 13 chiffres + clé (2A/2B acceptés).
  nir text not null check (nir ~ '^[12][0-9]{2}(0[1-9]|1[0-2]|[2-9][0-9])(2A|2B|[0-9]{2})[0-9]{6}[0-9]{2}$'),
  adresse text not null,
  updated_at timestamptz not null default now()
);
alter table infos_contrat enable row level security;
create policy "extra : ses informations" on infos_contrat for all to authenticated
  using (extra_id = auth.uid()) with check (extra_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Contrats : une ligne par affectation, signée par les deux parties.
-- ---------------------------------------------------------------------------
create table contrats (
  affectation_id uuid primary key references affectations (id) on delete cascade,
  signe_restaurant_le timestamptz,
  signature_restaurant text,
  signe_extra_le timestamptz,
  signature_extra text
);
alter table contrats enable row level security;

-- Le restaurateur propriétaire de la demande, ou l'extra affecté.
create function partie_au_contrat(p_affectation uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when a.extra_id = auth.uid() then 'extra'
    when r.proprietaire = auth.uid() then 'restaurant'
  end
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  where a.id = p_affectation
$$;

create policy "parties : lecture du contrat" on contrats for select to authenticated
  using (partie_au_contrat(affectation_id) is not null);

create function signer_contrat(p_affectation uuid, p_signature text) returns void
language plpgsql security definer set search_path = public as $$
declare partie text := partie_au_contrat(p_affectation);
begin
  if partie is null then
    raise exception 'Contrat introuvable' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from affectations where id = p_affectation and statut = 'confirmee') then
    raise exception 'Mission non confirmée';
  end if;
  if length(p_signature) < 100 or length(p_signature) > 200000 then
    raise exception 'Signature invalide';
  end if;
  if partie = 'extra' and not exists (select 1 from infos_contrat where extra_id = auth.uid()) then
    raise exception 'Informations du contrat manquantes';
  end if;
  insert into contrats (affectation_id) values (p_affectation) on conflict do nothing;
  if partie = 'extra' then
    update contrats set signe_extra_le = now(), signature_extra = p_signature
     where affectation_id = p_affectation and signe_extra_le is null;
  else
    update contrats set signe_restaurant_le = now(), signature_restaurant = p_signature
     where affectation_id = p_affectation and signe_restaurant_le is null;
  end if;
end $$;

-- Informations de l'extra pour la DPAE : seulement au restaurateur d'une mission confirmée.
create function infos_dpae(p_affectation uuid)
returns table (prenom text, nom text, date_naissance date, lieu_naissance text, nir text, adresse text)
language sql stable security definer set search_path = public as $$
  select e.prenom, e.nom, i.date_naissance, i.lieu_naissance, i.nir, i.adresse
  from affectations a
  join extras e on e.id = a.extra_id
  left join infos_contrat i on i.extra_id = e.id
  where a.id = p_affectation and a.statut in ('confirmee', 'terminee')
    and partie_au_contrat(p_affectation) = 'restaurant'
$$;

-- ---------------------------------------------------------------------------
-- Notation après mission, favoris.
-- ---------------------------------------------------------------------------
create table notations (
  affectation_id uuid primary key references affectations (id) on delete cascade,
  present boolean not null,
  note smallint check (note between 1 and 5),
  commentaire text check (length(commentaire) <= 500),
  created_at timestamptz not null default now(),
  check (present or note is null)
);
alter table notations enable row level security;
create policy "restaurateur : ses notations" on notations for select to authenticated
  using (partie_au_contrat(affectation_id) = 'restaurant');

create table favoris (
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  extra_id uuid not null references extras (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, extra_id)
);
alter table favoris enable row level security;
create policy "restaurateur : ses favoris" on favoris for all to authenticated
  using (restaurant_id in (select id from restaurants where proprietaire = auth.uid()))
  with check (restaurant_id in (select id from restaurants where proprietaire = auth.uid()));

-- Note la mission une fois terminée. Absent : l'affectation passe « absente » (non facturée,
-- revue par le back-office pour la règle d'exclusion).
create function noter_mission(p_affectation uuid, p_present boolean, p_note smallint,
                              p_favori boolean, p_commentaire text) returns void
language plpgsql security definer set search_path = public as $$
declare
  a affectations;
  d demandes;
begin
  if partie_au_contrat(p_affectation) is distinct from 'restaurant' then
    raise exception 'Notation réservée au restaurateur' using errcode = 'insufficient_privilege';
  end if;
  select * into a from affectations where id = p_affectation;
  select * into d from demandes where id = a.demande_id;
  if debut_mission(d.jour, d.debut) > now() then
    raise exception 'Mission pas encore commencée';
  end if;
  insert into notations (affectation_id, present, note, commentaire)
  values (p_affectation, p_present, case when p_present then p_note end, nullif(trim(p_commentaire), ''))
  on conflict (affectation_id) do update
    set present = excluded.present, note = excluded.note, commentaire = excluded.commentaire;
  update affectations
     set statut = (case when p_present then 'terminee' else 'absente' end)::statut_affectation, updated_at = now()
   where id = p_affectation and statut in ('confirmee', 'terminee', 'absente');
  if p_favori and p_present then
    insert into favoris (restaurant_id, extra_id) values (d.restaurant_id, a.extra_id) on conflict do nothing;
  else
    delete from favoris where restaurant_id = d.restaurant_id and extra_id = a.extra_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Disponibilités de l'extra (midi / soir), pour le prévenir en priorité.
-- ---------------------------------------------------------------------------
create table disponibilites (
  extra_id uuid not null references extras (id) on delete cascade,
  jour date not null,
  creneau text not null check (creneau in ('midi', 'soir')),
  primary key (extra_id, jour, creneau)
);
alter table disponibilites enable row level security;
create policy "extra : ses disponibilités" on disponibilites for all to authenticated
  using (extra_id = auth.uid()) with check (extra_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Clôture : une mission dont la fin est passée devient « terminee ».
-- À planifier (pg_cron, toutes les 15 minutes) côté back-office.
-- ---------------------------------------------------------------------------
create function cloturer_missions() returns integer
language sql security definer set search_path = public as $$
  with fermees as (
    update demandes d set statut = 'terminee'
    where d.statut in ('publiee', 'pourvue')
      and debut_mission(d.jour, d.debut)
          + make_interval(mins => case when d.fin > d.debut then d.fin - d.debut else d.fin + 1440 - d.debut end)
          < now()
    returning 1
  )
  select count(*)::integer from fermees
$$;
revoke execute on function cloturer_missions() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Factures mensuelles : 1 mise en relation facturée par extra venu (ou en poste),
-- jamais pour une absence ni un désistement.
-- ---------------------------------------------------------------------------
create function factures_restaurant()
returns table (mois text, mises_en_relation integer, montant_ht_centimes integer, tva_pour_mille integer)
language sql stable security definer set search_path = public as $$
  select to_char(d.jour, 'YYYY-MM'),
         count(*)::integer,
         sum(d.frais_mise_en_relation_ht_centimes)::integer,
         (parametres_en_vigueur(max(d.jour))).tva_pour_mille
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  where r.proprietaire = auth.uid()
    and a.statut in ('confirmee', 'terminee')
    and debut_mission(d.jour, d.debut) < now()
  group by 1
  order by 1 desc
$$;

revoke execute on function signer_contrat(uuid, text), infos_dpae(uuid), noter_mission(uuid, boolean, smallint, boolean, text),
  factures_restaurant(), partie_au_contrat(uuid) from public, anon;
grant execute on function signer_contrat(uuid, text), infos_dpae(uuid), noter_mission(uuid, boolean, smallint, boolean, text),
  factures_restaurant(), partie_au_contrat(uuid) to authenticated;

alter publication supabase_realtime add table contrats;
