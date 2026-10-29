-- Page d'accueil publique (kivien.re).

-- Le taux horaire (SMIC) et les frais Kivien sont affichés sur la page d'accueil, sans compte.
-- Ce sont des informations publiques : lecture seule pour le rôle anonyme.
create policy "lecture publique des paramètres" on parametres for select to anon using (true);
grant select on parametres to anon;

-- ---------------------------------------------------------------------------
-- Lettre d'information : adresses e-mail des inscrits. Aucune lecture par l'API :
-- l'inscription passe uniquement par inscrire_lettre(), qui ne dit pas si l'adresse existait.
-- ---------------------------------------------------------------------------
create table abonnes_lettre (
  email text primary key check (email = lower(email) and length(email) <= 254),
  inscrit_le timestamptz not null default now(),
  desinscrit_le timestamptz
);
alter table abonnes_lettre enable row level security;
revoke all on abonnes_lettre from anon, authenticated;

create function inscrire_lettre(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  e text := lower(btrim(coalesce(p_email, '')));
begin
  if length(e) > 254 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  insert into abonnes_lettre (email) values (e)
  on conflict (email) do update
    set desinscrit_le = null,
        inscrit_le = case when abonnes_lettre.desinscrit_le is null then abonnes_lettre.inscrit_le else now() end;
end $$;
revoke execute on function inscrire_lettre(text) from public;
grant execute on function inscrire_lettre(text) to anon, authenticated;
