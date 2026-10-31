-- Acceptation des conditions générales et de la politique de confidentialité, à la création du
-- compte (établissement ou extra) : version acceptée et date, conservées comme preuve.

create table acceptations_cgu (
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  version text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  le timestamptz not null default now(),
  primary key (utilisateur_id, version)
);
alter table acceptations_cgu enable row level security;
create policy "chacun : ses acceptations" on acceptations_cgu for select to authenticated
  using (utilisateur_id = auth.uid());
revoke insert, update, delete on acceptations_cgu from anon, authenticated;

create function accepter_cgu(p_version text)
returns void
language sql security definer set search_path = public as $$
  insert into acceptations_cgu (utilisateur_id, version) values (auth.uid(), p_version)
  on conflict do nothing;
$$;
revoke execute on function accepter_cgu(text) from public, anon;
grant execute on function accepter_cgu(text) to authenticated;
