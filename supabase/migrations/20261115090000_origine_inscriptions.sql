-- Origine des inscrits (extras et établissements) : réponse à « Comment as-tu connu Kivien ? »
-- (facultative, app extra) et première visite du navigateur (site d'origine, page d'arrivée,
-- campagne utm). Lue seulement dans l'espace admin.

create table origines_comptes (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  comment_connu text check (comment_connu in ('google', 'reseaux', 'ami', 'etablissement', 'autre')),
  referent text check (length(referent) <= 100),
  page_arrivee text check (length(page_arrivee) <= 200),
  utm text check (length(utm) <= 200),
  premiere_visite timestamptz,
  note_le timestamptz not null default now()
);
alter table origines_comptes enable row level security;
revoke all on origines_comptes from public, anon, authenticated;

-- Notée à l'inscription. La première visite déjà notée n'est jamais remplacée ; la réponse à la
-- question peut être ajoutée plus tard.
create function noter_origine(p_comment_connu text, p_referent text, p_page text, p_utm text, p_premiere_visite timestamptz)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = 'insufficient_privilege';
  end if;
  if p_comment_connu is not null and p_comment_connu not in ('google', 'reseaux', 'ami', 'etablissement', 'autre') then
    raise exception 'Réponse inconnue';
  end if;
  insert into origines_comptes (utilisateur_id, comment_connu, referent, page_arrivee, utm, premiere_visite)
  values (auth.uid(), p_comment_connu, left(nullif(btrim(p_referent), ''), 100), left(nullif(btrim(p_page), ''), 200),
          left(nullif(btrim(p_utm), ''), 200), least(p_premiere_visite, now()))
  on conflict (utilisateur_id) do update
    set comment_connu = coalesce(origines_comptes.comment_connu, excluded.comment_connu),
        referent = case when origines_comptes.page_arrivee is null then excluded.referent else origines_comptes.referent end,
        utm = case when origines_comptes.page_arrivee is null then excluded.utm else origines_comptes.utm end,
        premiere_visite = coalesce(origines_comptes.premiere_visite, excluded.premiere_visite),
        page_arrivee = coalesce(origines_comptes.page_arrivee, excluded.page_arrivee);
end $$;

-- Espace admin : origine de chaque extra et de chaque établissement (celle de son créateur).
create function admin_origines()
returns table (type text, id uuid, comment_connu text, referent text, page_arrivee text, utm text, premiere_visite timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select 'extra'::text, e.id, o.comment_connu, o.referent, o.page_arrivee, o.utm, o.premiere_visite
    from extras e join origines_comptes o on o.utilisateur_id = e.id
    union all
    select x.type, x.id, x.comment_connu, x.referent, x.page_arrivee, x.utm, x.premiere_visite from (
      select distinct on (r.id) 'etablissement'::text as type, r.id, o.comment_connu, o.referent, o.page_arrivee, o.utm,
             o.premiere_visite
      from restaurants r
      join membres m on m.restaurant_id = r.id and m.role = 'gerant'
      join origines_comptes o on o.utilisateur_id = m.utilisateur_id
      order by r.id, m.created_at
    ) x;
end $$;

revoke execute on function noter_origine(text, text, text, text, timestamptz), admin_origines() from public, anon;
grant execute on function noter_origine(text, text, text, text, timestamptz), admin_origines() to authenticated;
