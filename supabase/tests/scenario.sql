-- Scénario : liste, course entre deux extras, désistement, SMIC figé.
\set ON_ERROR_STOP 1
-- Second extra pour tester la course
insert into auth.users (id, phone) values ('00000000-0000-0000-0000-0000000000e2', '262693000002');
insert into extras (id, prenom, telephone, commune, lat, lng, a_voiture)
values ('00000000-0000-0000-0000-0000000000e2', 'Maëlle', '+262693000002', 'Le Port', -20.94, 55.29, true);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
\echo '--- missions de Kévin (distances attendues 2100 / 2300 / 4800 / 6000)'
select restaurant, commune, distance_metres, poste, jour - jour_reunion() as dans_jours, retour_assure
from missions_disponibles() order by distance_metres;
\echo '--- Kévin ne lit pas les demandes directement (adresse cachée) :'
select count(*) as demandes_visibles from demandes;
\echo '--- Kévin dit mi lé la sur le Boucan'
select accepter_mission('00000000-0000-0000-0000-00000000d001');
\echo '--- Maëlle arrive trop tard'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select accepter_mission('00000000-0000-0000-0000-00000000d001');
\echo '--- Kévin se désiste, la mission redevient disponible pour Maëlle'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select se_desister('00000000-0000-0000-0000-00000000d001');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select count(*) as boucan_visible from missions_disponibles() where restaurant = 'Le Boucan Grillé';
select accepter_mission('00000000-0000-0000-0000-00000000d001');
\echo '--- Le restaurateur voit son affectation et le prénom'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select e.prenom, a.statut from affectations a join extras e on e.id = a.extra_id order by a.created_at;
\echo '--- Restaurateur : demande sous le SMIC refusée'
\set ON_ERROR_STOP 0
insert into demandes (restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng, taux_horaire_brut_centimes)
values ('00000000-0000-0000-0000-00000000b001', 'plonge', jour_reunion(), 1080, 0, 'x', 'Saint-Paul', 0, 0, 1200);
\set ON_ERROR_STOP 1
\echo '--- Demande sans taux : SMIC et frais figés'
insert into demandes (restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng, nb_extras)
values ('00000000-0000-0000-0000-00000000b001', 'plonge', jour_reunion(), 1080, 0, 'x', 'Saint-Paul', 0, 0, 2)
returning taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes, statut;
reset role;
select count(*) as signaux from signaux_missions;

-- ---------------------------------------------------------------------------
-- Étape c : détail, adresse cachée, expiration, désistement tardif
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
\echo '--- Kévin voit le Ti Kaz sans adresse (non confirmé)'
select restaurant, confirmee, disponible, adresse is null as adresse_cachee, tenue
from detail_mission('00000000-0000-0000-0000-00000000d002');
\echo '--- Kévin accepte le Ti Kaz : adresse visible'
select accepter_mission('00000000-0000-0000-0000-00000000d002');
select confirmee, adresse, code_postal, telephone is not null as tel
from detail_mission('00000000-0000-0000-0000-00000000d002');
\echo '--- Maëlle ne voit pas l’adresse du Ti Kaz, et la mission n’est plus disponible'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select disponible, confirmee, adresse is null as adresse_cachee from detail_mission('00000000-0000-0000-0000-00000000d002');
\echo '--- Désistement de Kévin à plus de 4 h (demain) : non tardif'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select se_desister('00000000-0000-0000-0000-00000000d002');
reset role;
select desistement_tardif from affectations
where demande_id = '00000000-0000-0000-0000-00000000d002' and extra_id = '00000000-0000-0000-0000-0000000000e1';
\echo '--- Mission dans 2 h : désistement tardif'
insert into demandes (id, restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng)
select '00000000-0000-0000-0000-00000000d0aa', '00000000-0000-0000-0000-00000000b002', 'plonge',
       (now() at time zone 'Indian/Reunion' + interval '2 hours')::date,
       extract(hour from now() at time zone 'Indian/Reunion' + interval '2 hours')::int * 60, 
       ((extract(hour from now() at time zone 'Indian/Reunion' + interval '2 hours')::int * 60) + 120) % 1440,
       'x', 'Saint-Paul', -21.0, 55.27;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select accepter_mission('00000000-0000-0000-0000-00000000d0aa');
select se_desister('00000000-0000-0000-0000-00000000d0aa');
reset role;
select desistement_tardif from affectations where demande_id = '00000000-0000-0000-0000-00000000d0aa';
\echo '--- Mission déjà commencée : expirée, absente de la liste'
update demandes set jour = jour_reunion() - 1 where id = '00000000-0000-0000-0000-00000000d0aa';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select accepter_mission('00000000-0000-0000-0000-00000000d0aa');
select count(*) as visible from missions_disponibles() where id = '00000000-0000-0000-0000-00000000d0aa';
select disponible from detail_mission('00000000-0000-0000-0000-00000000d0aa');
reset role;

-- ---------------------------------------------------------------------------
-- Étape e : contrat, DPAE, notation, favoris, factures, disponibilités
-- ---------------------------------------------------------------------------
\echo '--- Kévin reprend le Boucan (mission de ce soir) après Maëlle : place prise, il reste déjà_prise'
reset role;
-- On rend la mission du Boucan à Kévin pour la suite du scénario.
update affectations set statut = 'desistee' where demande_id = '00000000-0000-0000-0000-00000000d001';
update demandes set statut = 'publiee' where id = '00000000-0000-0000-0000-00000000d001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select accepter_mission('00000000-0000-0000-0000-00000000d001');
\echo '--- Kévin ne peut pas signer sans ses informations de contrat'
\set ON_ERROR_STOP 0
select signer_contrat((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'confirmee'), repeat('x', 200));
\set ON_ERROR_STOP 1
insert into infos_contrat (extra_id, date_naissance, lieu_naissance, nir, adresse)
values ('00000000-0000-0000-0000-0000000000e1', '2001-05-12', 'Saint-Paul (974)', '101059741512345', '5 chemin des Vacoas, 97460 Saint-Paul');
select signer_contrat((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'confirmee'), repeat('x', 200));
\echo '--- Maëlle ne voit ni le contrat ni les informations de Kévin'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select count(*) as contrats_visibles from contrats;
select count(*) as infos_visibles from infos_contrat;
\echo '--- Le restaurateur signe et lit les informations DPAE'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select signer_contrat((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'confirmee'), repeat('y', 200));
select signe_restaurant_le is not null as resto, signe_extra_le is not null as extra from contrats;
select prenom, nom, nir from infos_dpae((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'confirmee'));
\echo '--- Notation impossible avant le début de la mission'
\set ON_ERROR_STOP 0
select noter_mission((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'confirmee'), true, 5::smallint, true, null);
\set ON_ERROR_STOP 1
\echo '--- Mission passée : notée, Kévin en favori, facturée'
reset role;
update demandes set jour = jour_reunion() - 2 where id = '00000000-0000-0000-0000-00000000d001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select noter_mission((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'confirmee'), true, 5::smallint, true, 'Très bien');
select count(*) as favoris from favoris;
select mois = to_char(jour_reunion() - 2, 'YYYY-MM') as bon_mois, mises_en_relation, montant_ht_centimes, tva_pour_mille from factures_restaurant();
\echo '--- Absent : non facturé, retiré des favoris'
select noter_mission((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'terminee'), false, null, true, null);
select count(*) as favoris from favoris;
select count(*) as lignes_facture from factures_restaurant();
\echo '--- Disponibilités de Kévin, invisibles pour Maëlle'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into disponibilites (extra_id, jour, creneau) values ('00000000-0000-0000-0000-0000000000e1', jour_reunion() + 1, 'soir');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select count(*) as dispos_visibles from disponibilites;
reset role;
\echo '--- Clôture des missions terminées'
select cloturer_missions() >= 0 as cloture_ok;

-- ---------------------------------------------------------------------------
-- Étape e, côté extra : missions confirmées, contrat
-- ---------------------------------------------------------------------------
\echo '--- Kévin accepte le Ti Kaz : il apparaît dans ses missions, contrat non signé'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select accepter_mission('00000000-0000-0000-0000-00000000d002');
select restaurant, contrat_signe from mes_missions();
select employeur, adresse_employeur, signe_extra from contrat_extra('00000000-0000-0000-0000-00000000d002');
select signer_contrat((select affectation_id from contrat_extra('00000000-0000-0000-0000-00000000d002')), repeat('z', 200));
select restaurant, contrat_signe from mes_missions();
\echo '--- Maëlle ne voit pas le contrat de Kévin'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select count(*) as contrats from contrat_extra('00000000-0000-0000-0000-00000000d002');
\echo '--- Consignes visibles dans le détail quand la tenue est vide'
reset role;
update demandes set tenue = null, consignes = 'Parking derrière, entrée par la cuisine.' where id = '00000000-0000-0000-0000-00000000d003';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select tenue from detail_mission('00000000-0000-0000-0000-00000000d003');
reset role;
\echo '--- Inscription : le téléphone doit être celui vérifié par SMS'
insert into auth.users (id, phone) values ('00000000-0000-0000-0000-0000000000e3', '262693000099');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
\set ON_ERROR_STOP 0
insert into extras (id, prenom, nom, telephone, commune, lat, lng) values
  ('00000000-0000-0000-0000-0000000000e3', 'Johan', 'Grondin', '+262692000001', 'Le Port', -20.93, 55.29);
\set ON_ERROR_STOP 1
insert into extras (id, prenom, nom, telephone, commune, lat, lng) values
  ('00000000-0000-0000-0000-0000000000e3', 'Johan', 'Grondin', '+262693000099', 'Le Port', -20.93, 55.29);
select prenom, telephone from extras;
reset role;
