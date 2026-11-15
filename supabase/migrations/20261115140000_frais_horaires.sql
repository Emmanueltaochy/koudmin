-- Frais Kivien à l'heure d'extra (3,50 € HT par heure à partir du 15 novembre 2026, au lieu de
-- 19 € HT fixes) et durée minimum d'une mission (2 h). Frais d'une demande, par extra :
--   frais_mise_en_relation_ht_centimes (part fixe, 0 désormais) + durée × frais_horaire_ht_centimes,
-- arrondi au centime et figé à la publication, comme avant : factures, paiements et admin lisent
-- toujours demandes.frais_mise_en_relation_ht_centimes. Les demandes déjà publiées ne changent pas.

alter table parametres
  add column frais_horaire_ht_centimes integer not null default 0 check (frais_horaire_ht_centimes >= 0),
  add column duree_minimum_minutes integer not null default 0 check (duree_minimum_minutes between 0 and 720);

alter table demandes add column frais_horaire_ht_centimes integer check (frais_horaire_ht_centimes >= 0);

insert into parametres (date_effet, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes, tva_pour_mille,
                        frais_horaire_ht_centimes, duree_minimum_minutes)
select date '2026-11-15', p.taux_horaire_brut_centimes, 0, p.tva_pour_mille, 350, 120
from parametres_en_vigueur(date '2026-11-15') p
where p.date_effet is not null
on conflict (date_effet) do update
  set frais_mise_en_relation_ht_centimes = 0, frais_horaire_ht_centimes = 350, duree_minimum_minutes = 120;

-- Frais d'un extra pour une mission de p_minutes, selon des paramètres donnés.
create function frais_par_extra_centimes(p parametres, p_minutes integer) returns integer
language sql immutable as $$
  select p.frais_mise_en_relation_ht_centimes + round(p_minutes * p.frais_horaire_ht_centimes / 60.0)::integer
$$;

-- Fige taux et frais à la publication ; refuse une mission plus courte que le minimum.
create or replace function figer_tarifs() returns trigger language plpgsql as $$
declare
  p parametres;
  duree integer := duree_mission(new.debut, new.fin);
begin
  p := parametres_en_vigueur();
  if p.date_effet is null then
    raise exception 'Aucun paramètre tarifaire en vigueur';
  end if;
  if duree < p.duree_minimum_minutes then
    raise exception 'Mission trop courte' using errcode = 'check_violation';
  end if;
  new.frais_horaire_ht_centimes := p.frais_horaire_ht_centimes;
  new.frais_mise_en_relation_ht_centimes := frais_par_extra_centimes(p, duree);
  new.taux_horaire_brut_centimes := coalesce(new.taux_horaire_brut_centimes, p.taux_horaire_brut_centimes);
  if new.taux_horaire_brut_centimes < p.taux_horaire_brut_centimes then
    raise exception 'Taux horaire sous le minimum légal' using errcode = 'check_violation';
  end if;
  return new;
end $$;
