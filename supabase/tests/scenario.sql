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
