-- Formule « tout compris » (préparée, fermée par défaut) : au lieu d'embaucher l'extra lui-même,
-- l'établissement reçoit une facture unique (salaire × coefficient), l'extra étant embauché par une
-- agence de travail temporaire partenaire. Tant que reglages_formules.tout_compris_actif est faux,
-- rien ne change : toutes les demandes restent en formule « declaration » (mise en relation, frais
-- Kivien à l'heure). L'ouvrir suppose un partenaire et la suite du parcours (contrat de mission,
-- facturation), qui ne sont pas encore construits.

create table reglages_formules (
  id smallint primary key default 1 check (id = 1),
  tout_compris_actif boolean not null default false,
  -- Prix facturé = salaire brut × coefficient, en millièmes (2000 = × 2).
  coefficient_milliemes integer not null default 2000 check (coefficient_milliemes between 1000 and 4000),
  maj_le timestamptz not null default now()
);
insert into reglages_formules default values;
alter table reglages_formules enable row level security;
revoke all on reglages_formules from anon, authenticated;

alter table demandes
  add column formule text not null default 'declaration' check (formule in ('declaration', 'tout_compris')),
  -- Figé à la publication pour la formule tout compris, null sinon.
  add column coefficient_milliemes integer check (coefficient_milliemes between 1000 and 4000),
  add check ((formule = 'tout_compris') = (coefficient_milliemes is not null));

-- Prix HT d'un extra en formule tout compris, arrondi au centime.
create function prix_tout_compris_centimes(p_taux_horaire_brut_centimes integer, p_minutes integer, p_coefficient_milliemes integer)
returns integer language sql immutable as $$
  select round(p_minutes::numeric * p_taux_horaire_brut_centimes * p_coefficient_milliemes / 60000)::integer
$$;

-- Ce que le formulaire de demande propose.
create function formules_proposees()
returns table (tout_compris boolean, coefficient_milliemes integer)
language sql stable security definer set search_path = public as $$
  select r.tout_compris_actif, r.coefficient_milliemes from reglages_formules r where r.id = 1
$$;
revoke execute on function formules_proposees() from public, anon;
grant execute on function formules_proposees() to authenticated;

-- Fige taux et frais à la publication ; refuse une mission plus courte que le minimum.
-- Formule tout compris : refusée tant qu'elle est fermée ; le coefficient est figé, et Kivien ne
-- facture pas de frais de mise en relation (la facture unique les remplace).
create or replace function figer_tarifs() returns trigger language plpgsql as $$
declare
  p parametres;
  v_ouverte boolean;
  v_coefficient integer;
  duree integer := duree_mission(new.debut, new.fin);
begin
  p := parametres_en_vigueur();
  if p.date_effet is null then
    raise exception 'Aucun paramètre tarifaire en vigueur';
  end if;
  if duree < p.duree_minimum_minutes then
    raise exception 'Mission trop courte' using errcode = 'check_violation';
  end if;
  new.taux_horaire_brut_centimes := coalesce(new.taux_horaire_brut_centimes, p.taux_horaire_brut_centimes);
  if new.taux_horaire_brut_centimes < p.taux_horaire_brut_centimes then
    raise exception 'Taux horaire sous le minimum légal' using errcode = 'check_violation';
  end if;
  if new.formule = 'tout_compris' then
    -- Le réglage n'est lisible que par cette fonction (table fermée aux comptes).
    select x.tout_compris, x.coefficient_milliemes into v_ouverte, v_coefficient from formules_proposees() x;
    if not coalesce(v_ouverte, false) then
      raise exception 'Formule tout compris indisponible' using errcode = 'check_violation';
    end if;
    new.coefficient_milliemes := v_coefficient;
    new.frais_horaire_ht_centimes := 0;
    new.frais_mise_en_relation_ht_centimes := 0;
  else
    new.coefficient_milliemes := null;
    new.frais_horaire_ht_centimes := p.frais_horaire_ht_centimes;
    new.frais_mise_en_relation_ht_centimes := frais_par_extra_centimes(p, duree);
  end if;
  return new;
end $$;

-- Espace admin.
create function admin_reglages_formules()
returns table (tout_compris_actif boolean, coefficient_milliemes integer, demandes_tout_compris integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform verifier_admin();
  return query
    select r.tout_compris_actif, r.coefficient_milliemes,
           (select count(*)::integer from demandes d where d.formule = 'tout_compris')
    from reglages_formules r where r.id = 1;
end $$;

create function admin_regler_formules(p_tout_compris boolean, p_coefficient_milliemes integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform verifier_admin();
  if p_coefficient_milliemes is null or p_coefficient_milliemes not between 1000 and 4000 then
    raise exception 'Coefficient hors limites';
  end if;
  update reglages_formules
     set tout_compris_actif = p_tout_compris, coefficient_milliemes = p_coefficient_milliemes, maj_le = now()
   where id = 1;
end $$;
revoke execute on function admin_reglages_formules(), admin_regler_formules(boolean, integer) from public, anon;
grant execute on function admin_reglages_formules(), admin_regler_formules(boolean, integer) to authenticated;
