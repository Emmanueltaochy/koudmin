-- Équipe Kivien : compteur des extras inscrits (par commune, métier, disponibilités)
-- et des établissements, pour le recrutement zone par zone. Aucune donnée personnelle :
-- ni nom, ni mobile. Un compte devient administrateur avec deploy/vps/ajouter-admin.sh.
create table admins (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;

create function est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where utilisateur_id = auth.uid())
$$;

-- Prochain samedi et dimanche (le week-end en cours si l'on est samedi ou dimanche).
create function week_end_reunion() returns daterange
language sql stable as $$
  select case extract(isodow from jour_reunion())::int
    when 7 then daterange(jour_reunion() - 1, jour_reunion() + 1)
    else daterange(jour_reunion() + (6 - extract(isodow from jour_reunion())::int), jour_reunion() + (8 - extract(isodow from jour_reunion())::int))
  end
$$;

create function statistiques_extras()
returns table (commune text, competences poste[], experience text, a_voiture boolean, inscrit_le timestamptz,
               dispo_week_end boolean, dispo_7_jours boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Réservé aux administrateurs Kivien' using errcode = '42501';
  end if;
  return query
    select e.commune, e.competences, e.experience, e.a_voiture, e.created_at,
           exists (select 1 from disponibilites d where d.extra_id = e.id and d.jour <@ week_end_reunion()),
           exists (select 1 from disponibilites d where d.extra_id = e.id and d.jour between jour_reunion() and jour_reunion() + 6)
    from extras e;
end $$;

create function statistiques_etablissements()
returns table (commune text, lat double precision, lng double precision, secteur text, inscrit_le timestamptz, demandes integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not est_admin() then
    raise exception 'Réservé aux administrateurs Kivien' using errcode = '42501';
  end if;
  return query
    select r.commune, r.lat, r.lng, r.secteur, r.created_at, (select count(*)::integer from demandes d where d.restaurant_id = r.id)
    from restaurants r;
end $$;

revoke execute on function est_admin(), statistiques_extras(), statistiques_etablissements() from public, anon;
grant execute on function est_admin(), statistiques_extras(), statistiques_etablissements() to authenticated;
