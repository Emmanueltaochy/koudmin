-- Profil de l'extra : compétences, expérience, langues, présentation et photo.
-- Visibles par l'extra et par les restaurateurs chez qui il ou elle a une mission
-- (mêmes règles que les autres colonnes de `extras`).

alter table extras
  add column competences poste[] not null default '{}',
  add column experience text
    check (experience in ('debutant', 'moins_1_an', '1_3_ans', 'plus_3_ans')),
  add column langues text[] not null default '{}'
    check (langues <@ array['francais', 'creole', 'anglais', 'espagnol', 'allemand', 'italien']),
  add column presentation text not null default ''
    check (char_length(presentation) <= 280);

-- ---------------------------------------------------------------------------
-- Photo de profil : petite image JPEG (recadrée et compressée par l'app), hors de `extras`
-- pour que les listes restent légères. Lue et écrite seulement par les fonctions ci-dessous.
-- ---------------------------------------------------------------------------
create table photos_extras (
  extra_id uuid primary key references extras (id) on delete cascade,
  image bytea not null
    check (octet_length(image) between 100 and 150000 and substring(image from 1 for 3) = '\xffd8ff'::bytea),
  maj_le timestamptz not null default now()
);
alter table photos_extras enable row level security;
grant select, insert, update, delete on photos_extras to authenticated;

create policy "extra : sa photo" on photos_extras for all to authenticated
  using (extra_id = auth.uid())
  with check (extra_id = auth.uid());

create policy "restaurateur : photos des extras affectés" on photos_extras for select to authenticated
  using (extra_id in (
    select a.extra_id from affectations a
    join demandes d on d.id = a.demande_id
    join restaurants r on r.id = d.restaurant_id
    where r.proprietaire = auth.uid()));

-- Fonctions avec les droits de l'appelant : les règles ci-dessus s'appliquent.
create function enregistrer_photo(p_jpeg_base64 text) returns timestamptz
language sql security invoker set search_path = public as $$
  insert into photos_extras (extra_id, image) values (auth.uid(), decode(p_jpeg_base64, 'base64'))
  on conflict (extra_id) do update set image = excluded.image, maj_le = now()
  returning maj_le
$$;

create function supprimer_photo() returns void
language sql security invoker set search_path = public as $$
  delete from photos_extras where extra_id = auth.uid()
$$;

-- Base64 sur une seule ligne (directement utilisable en data:image/jpeg;base64,…), null sans photo.
create function photo_extra(p_extra uuid) returns text
language sql stable security invoker set search_path = public as $$
  select replace(encode(image, 'base64'), E'\n', '') from photos_extras where extra_id = p_extra
$$;

revoke execute on function enregistrer_photo(text), supprimer_photo(), photo_extra(uuid) from public, anon;
grant execute on function enregistrer_photo(text), supprimer_photo(), photo_extra(uuid) to authenticated;
