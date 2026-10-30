-- Secteurs où le contrat d'extra (CDD d'usage) est permis : article D1242-1 du Code du travail.
-- Chaque établissement déclare son secteur (son activité principale) ; ses demandes se limitent
-- aux métiers de ce secteur. Même liste que packages/core/src/secteurs.ts.

alter type poste add value 'cuisine';
alter type poste add value 'etages';
alter type poste add value 'animation';
alter type poste add value 'technique_spectacle';
alter type poste add value 'montage_spectacle';
alter type poste add value 'accueil_spectacle';
alter type poste add value 'demenagement';
alter type poste add value 'enquete';
alter type poste add value 'fete_foraine';
alter type poste add value 'entrepot_viande';
alter type poste add value 'reparation_navale';
alter type poste add value 'travaux_forestiers';
alter type poste add value 'formation';

create function postes_du_secteur(p_secteur text) returns text[]
language sql immutable as $$
  select case p_secteur
    when 'hotellerie_restauration' then array['serveur', 'barman', 'cuisine', 'commis', 'plonge', 'reception', 'etages']
    when 'loisirs_vacances' then array['animation', 'cuisine', 'commis', 'plonge', 'etages', 'reception']
    when 'spectacle' then array['technique_spectacle', 'montage_spectacle', 'accueil_spectacle']
    when 'demenagement' then array['demenagement']
    when 'enquetes_sondages' then array['enquete']
    when 'activites_foraines' then array['fete_foraine']
    when 'entreposage_viande' then array['entrepot_viande']
    when 'reparation_navale' then array['reparation_navale']
    when 'exploitation_forestiere' then array['travaux_forestiers']
    when 'enseignement' then array['formation']
  end
$$;

-- Les établissements déjà inscrits sont des restaurants, hôtels ou bars.
alter table restaurants add column secteur text not null default 'hotellerie_restauration'
  check (postes_du_secteur(secteur) is not null);

-- Une demande porte sur un métier du secteur de l'établissement.
create function verifier_poste_secteur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (new.poste::text = any (postes_du_secteur((select secteur from restaurants where id = new.restaurant_id)))) then
    raise exception 'Métier non autorisé pour ce secteur' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger verifier_poste_secteur before insert or update of poste, restaurant_id on demandes
  for each row execute function verifier_poste_secteur();

-- Création avec le secteur (l'ancienne signature reste pour les pages déjà ouvertes : hôtellerie-restauration).
create function creer_etablissement(
  p_nom text, p_siret text, p_secteur text, p_adresse text, p_code_postal text, p_commune text,
  p_lat double precision, p_lng double precision
) returns uuid
language plpgsql security definer set search_path = public as $$
declare id_restaurant uuid;
begin
  if postes_du_secteur(p_secteur) is null then
    raise exception 'Secteur non autorisé' using errcode = '22023';
  end if;
  id_restaurant := creer_restaurant(p_nom, p_siret, p_adresse, p_code_postal, p_commune, p_lat, p_lng);
  update restaurants set secteur = p_secteur where id = id_restaurant;
  return id_restaurant;
end $$;

drop function mes_etablissements();
create function mes_etablissements()
returns table (id uuid, nom text, telephone text, siret text, secteur text, adresse text, code_postal text,
               commune text, lat double precision, lng double precision, role role_membre)
language sql stable security definer set search_path = public as $$
  select r.id, r.nom, r.telephone, r.siret, r.secteur, r.adresse, r.code_postal, r.commune, r.lat, r.lng, m.role
  from membres m join restaurants r on r.id = m.restaurant_id
  where m.utilisateur_id = auth.uid()
  order by r.created_at, r.nom
$$;

revoke execute on function creer_etablissement(text, text, text, text, text, text, double precision, double precision),
  mes_etablissements(), verifier_poste_secteur() from public, anon;
grant execute on function creer_etablissement(text, text, text, text, text, text, double precision, double precision),
  mes_etablissements() to authenticated;

-- Contrat côté extra : le secteur et le SIRET de l'employeur figurent au contrat.
drop function contrat_extra(uuid);
create function contrat_extra(p_demande uuid)
returns table (
  affectation_id uuid, employeur text, adresse_employeur text, siret text, secteur text,
  signe_extra boolean, signe_restaurant boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, r.nom,
         concat_ws(', ', coalesce(r.adresse, d.adresse), concat_ws(' ', coalesce(r.code_postal, d.code_postal), coalesce(r.commune, d.commune))),
         r.siret, r.secteur,
         coalesce(c.signe_extra_le is not null, false),
         coalesce(c.signe_restaurant_le is not null, false)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  left join contrats c on c.affectation_id = a.id
  where a.demande_id = p_demande and a.extra_id = auth.uid() and a.statut = 'confirmee'
$$;
revoke execute on function contrat_extra(uuid) from public, anon;
grant execute on function contrat_extra(uuid) to authenticated;
