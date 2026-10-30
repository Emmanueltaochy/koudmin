-- Paiement des frais de mise en relation par les établissements.
--
-- Trois modes, au choix du gérant :
--   carte_mission  carte enregistrée chez Stripe, débitée 24 h après la fin de chaque mission ;
--   mensuel_carte  une facture par mois, débitée sur la carte enregistrée ;
--   mensuel_sepa   une facture par mois, prélevée sur le mandat SEPA (GoCardless).
-- Un extra absent (signalé par la notation) n'est jamais débité. Les montants viennent de la
-- demande (frais figés à la publication) et de la TVA en vigueur dans `parametres`.
-- Les tables ne s'écrivent que par les fonctions serveur (clé de service) : jamais depuis le site.

create table moyens_paiement (
  restaurant_id uuid primary key references restaurants (id) on delete cascade,
  mode text not null default 'carte_mission' check (mode in ('carte_mission', 'mensuel_carte', 'mensuel_sepa')),
  stripe_client text,
  stripe_carte text,
  -- « Visa •••• 4242 · 12/28 » : affichage seulement.
  carte_libelle text,
  gocardless_demande text,
  gocardless_mandat text,
  -- Libellé de l'IBAN (« FR76 •••• 1234 ») et état du mandat chez GoCardless.
  sepa_libelle text,
  mandat_statut text,
  maj_le timestamptz not null default now()
);

create table paiements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  type text not null check (type in ('mission', 'mensuel')),
  -- Débit à la mission : l'affectation payée (une seule fois).
  affectation_id uuid unique references affectations (id) on delete set null,
  -- Facture mensuelle : « 2026-11 ».
  mois text check (mois ~ '^\d{4}-\d{2}$'),
  moyen text not null check (moyen in ('carte', 'sepa')),
  mises_en_relation integer not null check (mises_en_relation > 0),
  montant_ht_centimes integer not null check (montant_ht_centimes > 0),
  tva_centimes integer not null check (tva_centimes >= 0),
  montant_ttc_centimes integer not null,
  libelle text not null,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'reussi', 'echoue')),
  -- Numéro de tentative : fait partie de la clé d'idempotence (un renvoi après coupure ne débite
  -- pas deux fois ; une nouvelle tentative après un refus, si).
  tentatives integer not null default 1 check (tentatives between 1 and 20),
  reference text,
  erreur text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  check (montant_ttc_centimes = montant_ht_centimes + tva_centimes),
  check ((type = 'mission' and mois is null) or (type = 'mensuel' and mois is not null and affectation_id is null))
);
create unique index paiements_mensuels on paiements (restaurant_id, mois) where type = 'mensuel';
create index paiements_restaurant on paiements (restaurant_id, cree_le desc);

-- Missions débitées à partir de cette date (fixée au branchement, puis au passage en réel :
-- rien d'antérieur n'est débité).
create table reglages_paiement (
  id boolean primary key default true check (id),
  debut date not null default jour_reunion(),
  mode_cles text not null default 'test' check (mode_cles in ('test', 'reel'))
);
insert into reglages_paiement default values;

alter table moyens_paiement enable row level security;
alter table paiements enable row level security;
alter table reglages_paiement enable row level security;
create policy "gérant : lecture du moyen de paiement" on moyens_paiement for select to authenticated
  using (est_gerant(restaurant_id));
create policy "gérant : lecture des paiements" on paiements for select to authenticated
  using (est_gerant(restaurant_id));
revoke all on moyens_paiement, paiements, reglages_paiement from anon;
revoke insert, update, delete on moyens_paiement, paiements, reglages_paiement from authenticated;
revoke all on reglages_paiement from authenticated;

-- TVA arrondie au centime le plus proche (même calcul que packages/core/src/facturation.ts).
create function tva_centimes(p_ht integer, p_tva_pour_mille integer) returns integer
language sql immutable as $$ select ((2 * p_ht::bigint * p_tva_pour_mille + 1000) / 2000)::integer $$;

-- Mise en relation débitable : extra venu (ou pas encore noté), mission finie depuis 24 h.
create function fin_mission(p_jour date, p_debut smallint, p_fin smallint) returns timestamptz
language sql immutable as $$
  select debut_mission(p_jour, p_debut)
         + make_interval(mins => case when p_fin > p_debut then p_fin - p_debut else p_fin + 1440 - p_debut end)
$$;

-- Débits à lancer pour le mode « carte_mission » (fonction serveur des prélèvements).
create function paiements_a_lancer(p_restaurant uuid default null)
returns table (affectation_id uuid, restaurant_id uuid, stripe_client text, stripe_carte text,
               libelle text, montant_ht_centimes integer, tva_centimes integer)
language sql stable security definer set search_path = public as $$
  select a.id, d.restaurant_id, m.stripe_client, m.stripe_carte,
         concat('Kivien · mise en relation du ', to_char(d.jour, 'DD/MM/YYYY'), ' · ', r.nom),
         d.frais_mise_en_relation_ht_centimes,
         tva_centimes(d.frais_mise_en_relation_ht_centimes, (parametres_en_vigueur(d.jour)).tva_pour_mille)
  from affectations a
  join demandes d on d.id = a.demande_id
  join restaurants r on r.id = d.restaurant_id
  join moyens_paiement m on m.restaurant_id = d.restaurant_id
  cross join reglages_paiement g
  where a.statut in ('confirmee', 'terminee')
    and d.statut <> 'annulee'
    and m.mode = 'carte_mission'
    and m.stripe_carte is not null
    and d.jour >= g.debut
    and fin_mission(d.jour, d.debut, d.fin) + interval '24 hours' <= now()
    and not exists (select 1 from paiements p where p.affectation_id = a.id)
    -- Déjà comprise dans une facture mensuelle (changement de mode en cours de mois).
    and not exists (select 1 from paiements p where p.restaurant_id = d.restaurant_id and p.type = 'mensuel'
                    and p.mois = to_char(d.jour, 'YYYY-MM'))
    and (p_restaurant is null or d.restaurant_id = p_restaurant)
  order by d.jour, d.debut
  limit 200
$$;

-- Factures mensuelles à prélever : mois terminés depuis un jour, non encore facturés.
create function mois_a_facturer(p_restaurant uuid default null)
returns table (restaurant_id uuid, mois text, mode text, stripe_client text, stripe_carte text, gocardless_mandat text,
               libelle text, mises_en_relation integer, montant_ht_centimes integer, tva_centimes integer)
language sql stable security definer set search_path = public as $$
  with lignes as (
    select d.restaurant_id, to_char(d.jour, 'YYYY-MM') as mois, d.frais_mise_en_relation_ht_centimes as ht,
           tva_centimes(d.frais_mise_en_relation_ht_centimes, (parametres_en_vigueur(d.jour)).tva_pour_mille) as tva
    from affectations a
    join demandes d on d.id = a.demande_id
    cross join reglages_paiement g
    where a.statut in ('confirmee', 'terminee')
      and d.statut <> 'annulee'
      and d.jour >= g.debut
      and d.jour < date_trunc('month', jour_reunion() - 1)::date
      and not exists (select 1 from paiements p where p.affectation_id = a.id)
      and (p_restaurant is null or d.restaurant_id = p_restaurant)
  )
  select l.restaurant_id, l.mois, m.mode, m.stripe_client, m.stripe_carte, m.gocardless_mandat,
         concat('Kivien · facture ', l.mois, ' · ', r.nom),
         count(*)::integer, sum(l.ht)::integer, sum(l.tva)::integer
  from lignes l
  join moyens_paiement m on m.restaurant_id = l.restaurant_id
  join restaurants r on r.id = l.restaurant_id
  where m.mode in ('mensuel_carte', 'mensuel_sepa')
    and not exists (select 1 from paiements p where p.restaurant_id = l.restaurant_id and p.type = 'mensuel' and p.mois = l.mois)
  group by l.restaurant_id, l.mois, m.mode, m.stripe_client, m.stripe_carte, m.gocardless_mandat, r.nom
  order by l.mois
$$;

-- Ce que l'établissement doit (missions faites, pas encore débitées), pour la page Paiement.
create function a_regler(p_restaurant uuid)
returns table (mises_en_relation integer, montant_ht_centimes integer, tva_centimes integer)
language sql stable security definer set search_path = public as $$
  select count(*)::integer, coalesce(sum(d.frais_mise_en_relation_ht_centimes), 0)::integer,
         coalesce(sum(tva_centimes(d.frais_mise_en_relation_ht_centimes, (parametres_en_vigueur(d.jour)).tva_pour_mille)), 0)::integer
  from affectations a
  join demandes d on d.id = a.demande_id
  cross join reglages_paiement g
  where d.restaurant_id = p_restaurant
    and est_gerant(p_restaurant)
    and a.statut in ('confirmee', 'terminee')
    and d.statut <> 'annulee'
    and d.jour >= g.debut
    and debut_mission(d.jour, d.debut) < now()
    and not exists (select 1 from paiements p where p.affectation_id = a.id)
    and not exists (select 1 from paiements p where p.restaurant_id = p_restaurant and p.type = 'mensuel'
                    and p.mois = to_char(d.jour, 'YYYY-MM') and p.statut <> 'echoue')
$$;

revoke execute on function paiements_a_lancer(uuid), mois_a_facturer(uuid) from public, anon, authenticated;
grant execute on function paiements_a_lancer(uuid), mois_a_facturer(uuid) to service_role;
revoke execute on function a_regler(uuid) from public, anon;
grant execute on function a_regler(uuid) to authenticated;
