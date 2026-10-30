-- Inscription des restaurateurs depuis le site (bouton « Créer un compte »).
-- Le compte est actif tout de suite ; le SIRET est obligatoire et vérifié (clé de Luhn).

-- Même règle que siretValide() dans packages/core/src/siret.ts.
create function siret_valide(p text) returns boolean
language sql immutable as $$
  select p ~ '^[0-9]{14}$' and case
    when left(p, 9) = '356000000' then
      (select sum(substr(p, i, 1)::int) from generate_series(1, 14) i) % 5 = 0
    else
      (select sum(case
         when (15 - i) % 2 = 0 then (substr(p, i, 1)::int * 2) - case when substr(p, i, 1)::int * 2 > 9 then 9 else 0 end
         else substr(p, i, 1)::int
       end) from generate_series(1, 14) i) % 10 = 0
  end
$$;

-- Vide pour les comptes créés avant l'inscription en ligne (ajouter-restaurant.sh).
alter table restaurants add column siret text unique check (siret is null or siret_valide(siret));

-- Le restaurateur lit son établissement ; la création passe uniquement par creer_restaurant().
drop policy "restaurateur : son restaurant" on restaurants;
create policy "restaurateur : son restaurant" on restaurants for select to authenticated
  using (proprietaire = auth.uid());

-- Un même compte est soit extra, soit restaurateur.
drop policy "extra : son profil" on extras;
create policy "extra : son profil" on extras for all to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and telephone = telephone_verifie()
    and not exists (select 1 from restaurants r where r.proprietaire = auth.uid()));

create function creer_restaurant(
  p_nom text, p_siret text, p_adresse text, p_code_postal text, p_commune text, p_lat double precision, p_lng double precision
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_siret text := regexp_replace(coalesce(p_siret, ''), '[^0-9]', '', 'g');
  v_nom text := btrim(coalesce(p_nom, ''));
  id_restaurant uuid;
begin
  if uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if exists (select 1 from restaurants where proprietaire = uid) then
    raise exception 'Ce compte a déjà un établissement' using errcode = '23505';
  end if;
  if exists (select 1 from extras where id = uid) then
    raise exception 'Ce compte est un compte extra' using errcode = '23514';
  end if;
  if v_nom = '' or char_length(v_nom) > 120 then
    raise exception 'Nom de l''établissement invalide' using errcode = '22023';
  end if;
  if not siret_valide(v_siret) then
    raise exception 'Numéro SIRET invalide' using errcode = '22023';
  end if;
  if exists (select 1 from restaurants where restaurants.siret = v_siret) then
    raise exception 'SIRET déjà inscrit' using errcode = '23505';
  end if;
  if coalesce(p_code_postal, '') !~ '^974[0-9]{2}$'
     or p_lat not between -21.5 and -20.8 or p_lng not between 55.1 and 55.9 then
    raise exception 'Adresse hors de La Réunion' using errcode = '22023';
  end if;

  insert into restaurants (proprietaire, nom, telephone, siret, adresse, code_postal, commune, lat, lng)
  values (uid, v_nom, telephone_verifie(), v_siret, btrim(p_adresse), p_code_postal, btrim(p_commune), p_lat, p_lng)
  returning id into id_restaurant;
  return id_restaurant;
end $$;

revoke execute on function creer_restaurant(text, text, text, text, text, double precision, double precision) from public, anon;
grant execute on function creer_restaurant(text, text, text, text, text, double precision, double precision) to authenticated;
