-- Badges de confiance (missions réalisées, note moyenne, aucune absence, dossier complet) et
-- pointage du début et de la fin de mission par l'extra, vu par l'établissement.

-- ---------------------------------------------------------------------------
-- Confiance : historique de chaque extra d'une demande, pour l'équipe de l'établissement.
-- ---------------------------------------------------------------------------
create function confiance_extras(p_demande uuid)
returns table (extra_id uuid, missions integer, notes integer, note_moyenne_dixiemes integer,
               absences integer, dossier_complet boolean)
language sql stable security definer set search_path = public as $$
  select e.id,
    (select count(*)::integer from affectations a join demandes d on d.id = a.demande_id
      where a.extra_id = e.id and d.statut = 'terminee' and a.statut in ('confirmee', 'terminee')
        and not exists (select 1 from notations n where n.affectation_id = a.id and not n.present)),
    (select count(*)::integer from notations n join affectations a on a.id = n.affectation_id
      where a.extra_id = e.id and n.note is not null),
    (select round(avg(n.note) * 10)::integer from notations n join affectations a on a.id = n.affectation_id
      where a.extra_id = e.id and n.note is not null),
    (select count(*)::integer from affectations a where a.extra_id = e.id and a.statut = 'absente'),
    exists (select 1 from infos_contrat i where i.extra_id = e.id)
  from extras e
  where e.id in (select a.extra_id from affectations a join demandes d on d.id = a.demande_id
                 where d.id = p_demande and d.restaurant_id in (select mes_restaurants()))
$$;

-- ---------------------------------------------------------------------------
-- Pointage : l'extra pointe son arrivée (dès 1 h avant le début) et son départ (après l'arrivée,
-- jusqu'à 6 h après la fin prévue). Une seule fois chacun.
-- ---------------------------------------------------------------------------
create table pointages (
  affectation_id uuid primary key references affectations (id) on delete cascade,
  arrivee_le timestamptz,
  depart_le timestamptz,
  check (depart_le is null or (arrivee_le is not null and depart_le >= arrivee_le))
);
alter table pointages enable row level security;
create policy "parties : lecture du pointage" on pointages for select to authenticated
  using (partie_au_contrat(affectation_id) is not null);

create function fin_prevue(p_jour date, p_debut smallint, p_fin smallint) returns timestamptz
language sql immutable as $$
  select debut_mission(p_jour, p_debut)
       + make_interval(mins => case when p_fin > p_debut then p_fin - p_debut else p_fin + 1440 - p_debut end)
$$;

create function pointer(p_demande uuid, p_moment text)
returns table (arrivee_le timestamptz, depart_le timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  a affectations;
  d demandes;
  p pointages;
begin
  select * into a from affectations
   where demande_id = p_demande and extra_id = auth.uid() and statut = 'confirmee';
  if a.id is null then
    raise exception 'Mission non confirmée';
  end if;
  select * into d from demandes where id = p_demande;
  insert into pointages as pt (affectation_id) values (a.id) on conflict on constraint pointages_pkey do nothing;
  select * into p from pointages pt where pt.affectation_id = a.id;
  if p_moment = 'arrivee' then
    if now() < debut_mission(d.jour, d.debut) - interval '1 hour' then
      raise exception 'Pointage possible 1 h avant le début';
    end if;
    if now() > fin_prevue(d.jour, d.debut, d.fin) then
      raise exception 'Mission terminée';
    end if;
    update pointages pt set arrivee_le = coalesce(pt.arrivee_le, now()) where pt.affectation_id = a.id;
  elsif p_moment = 'depart' then
    if p.arrivee_le is null then
      raise exception 'Arrivée à pointer d''abord';
    end if;
    if now() > fin_prevue(d.jour, d.debut, d.fin) + interval '6 hours' then
      raise exception 'Mission terminée';
    end if;
    update pointages pt set depart_le = coalesce(pt.depart_le, now()) where pt.affectation_id = a.id;
  else
    raise exception 'Pointage inconnu';
  end if;
  return query select pt.arrivee_le, pt.depart_le from pointages pt where pt.affectation_id = a.id;
end $$;

-- Pointage de l'extra pour une mission (écran mission de l'app).
create function mon_pointage(p_demande uuid)
returns table (arrivee_le timestamptz, depart_le timestamptz)
language sql stable security definer set search_path = public as $$
  select pt.arrivee_le, pt.depart_le
  from pointages pt join affectations a on a.id = pt.affectation_id
  where a.demande_id = p_demande and a.extra_id = auth.uid()
$$;

revoke execute on function confiance_extras(uuid), pointer(uuid, text), mon_pointage(uuid) from public, anon;
grant execute on function confiance_extras(uuid), pointer(uuid, text), mon_pointage(uuid) to authenticated;
grant select on pointages to authenticated;
