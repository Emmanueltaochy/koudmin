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
