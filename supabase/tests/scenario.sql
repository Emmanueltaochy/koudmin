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
select mois = to_char(jour_reunion() - 2, 'YYYY-MM') as bon_mois, mises_en_relation, montant_ht_centimes, tva_pour_mille from factures_restaurant('00000000-0000-0000-0000-00000000b001');
\echo '--- Absent : non facturé, retiré des favoris'
select noter_mission((select id from affectations where demande_id = '00000000-0000-0000-0000-00000000d001' and statut = 'terminee'), false, null, true, null);
select count(*) as favoris from favoris;
select count(*) as lignes_facture from factures_restaurant('00000000-0000-0000-0000-00000000b001');
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
\echo '--- Page d''accueil : taux et frais lisibles sans compte'
set role anon;
select taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes from parametres order by date_effet desc limit 1;
\echo '--- Lettre d''information : inscription sans compte, doublon sans erreur, adresse invalide refusée'
select inscrire_lettre('  Lucette.Hoarau@Exemple.re ');
select inscrire_lettre('lucette.hoarau@exemple.re');
\set ON_ERROR_STOP 0
select inscrire_lettre('pas-une-adresse');
select count(*) from abonnes_lettre;
\set ON_ERROR_STOP 1
reset role;
select email from abonnes_lettre;
\echo '--- Profil de Kévin : compétences, expérience, langues, présentation'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
update extras set competences = '{serveur,barman}', experience = '1_3_ans', langues = '{francais,creole}',
  presentation = 'Deux saisons en salle à Saint-Gilles.' where id = auth.uid();
select competences, experience, langues, presentation from extras where id = auth.uid();
\set ON_ERROR_STOP 0
update extras set presentation = repeat('x', 281) where id = auth.uid();
\set ON_ERROR_STOP 1
\echo '--- Photo de Kévin : enregistrée, relue ; une image non JPEG est refusée'
select enregistrer_photo(encode('\xffd8ffe0'::bytea || convert_to(repeat('a', 200), 'UTF8'), 'base64')) is not null as photo_enregistree;
select left(photo_extra(auth.uid()), 8) as debut_photo;
\set ON_ERROR_STOP 0
select enregistrer_photo(encode(convert_to(repeat('a', 200), 'UTF8'), 'base64'));
\set ON_ERROR_STOP 1
\echo '--- Le restaurateur du Boucan voit le profil et la photo de Kévin ; Maëlle non'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select prenom, competences, experience from extras where id = '00000000-0000-0000-0000-0000000000e1';
select photo_extra('00000000-0000-0000-0000-0000000000e1') is not null as photo_visible_restaurateur;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select photo_extra('00000000-0000-0000-0000-0000000000e1') is null as photo_cachee_autre_extra;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select supprimer_photo();
select photo_extra(auth.uid()) is null as photo_retiree;
reset role;
\echo '--- Inscription d''un restaurateur depuis le site'
insert into auth.users (id, phone) values ('00000000-0000-0000-0000-0000000000a2', '262692000077'),
  ('00000000-0000-0000-0000-0000000000a3', '262692000078');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
\set ON_ERROR_STOP 0
insert into restaurants (proprietaire, nom) values (auth.uid(), 'Sans SIRET');
select creer_restaurant('Chez Lucette', '73282932000075', '12 rue du Port', '97420', 'Le Port', -20.93, 55.29);
\set ON_ERROR_STOP 1
select creer_restaurant('  Chez Lucette ', '732 829 320 00074', '12 rue du Port', '97420', 'Le Port', -20.93, 55.29) is not null as restaurant_cree;
select nom, telephone, siret, commune from restaurants;
\echo '--- Deuxième établissement (centre de vacances) pour le même compte'
select creer_etablissement('Les Filaos', '44306184100047', 'loisirs_vacances', '1 rue', '97420', 'Le Port', -20.93, 55.29) is not null as second_site;
select nom, secteur, role from mes_etablissements();
\set ON_ERROR_STOP 0
select creer_etablissement('Garage', '55210055400013', 'reparation_auto', '1 rue', '97420', 'Le Port', -20.93, 55.29);
insert into extras (id, prenom, nom, telephone, commune, lat, lng) values
  ('00000000-0000-0000-0000-0000000000a2', 'Lucette', 'Hoarau', '+262692000077', 'Le Port', -20.93, 55.29);
\set ON_ERROR_STOP 1
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
\set ON_ERROR_STOP 0
select creer_restaurant('Copie', '73282932000074', '12 rue du Port', '97420', 'Le Port', -20.93, 55.29);
\set ON_ERROR_STOP 1
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
\set ON_ERROR_STOP 0
select creer_restaurant('Kévin bar', '44306184100047', '1 rue', '97460', 'Saint-Paul', -21.0, 55.27);
\set ON_ERROR_STOP 1
reset role;
\echo '--- Plusieurs utilisateurs : Lucette invite un mobile en équipe'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select inviter_membre(id, '+262692000099', 'equipe') from restaurants where nom = 'Chez Lucette';
\set ON_ERROR_STOP 0
select inviter_membre(id, '+262692000001', 'equipe') from restaurants where nom = 'Chez Lucette';
select inviter_membre(id, '0692000099', 'equipe') from restaurants where nom = 'Chez Lucette';
\set ON_ERROR_STOP 1
select telephone, role, en_attente from equipe_etablissement((select id from restaurants where nom = 'Chez Lucette'));
reset role;
insert into auth.users (id, phone) values ('00000000-0000-0000-0000-0000000000a4', '262692000099');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';
\echo '--- Le membre rejoint l''établissement à sa connexion ; il voit ses demandes, pas les factures'
select accepter_invitations() as rejoint;
select nom, role from mes_etablissements();
select count(*) as factures_equipe from factures_restaurant((select id from restaurants where nom = 'Chez Lucette'));
\set ON_ERROR_STOP 0
select inviter_membre(id, '+262692000098', 'equipe') from restaurants where nom = 'Chez Lucette';
\set ON_ERROR_STOP 1
\echo '--- Demande : métier du secteur accepté, métier hors secteur refusé'
insert into demandes (restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng)
select id, 'cuisine', jour_reunion() + 3, 660, 900, '12 rue du Port', 'Le Port', -20.93, 55.29
from restaurants where nom = 'Chez Lucette' returning poste;
\set ON_ERROR_STOP 0
insert into demandes (restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng)
select id, 'animation', jour_reunion() + 3, 660, 900, '12 rue du Port', 'Le Port', -20.93, 55.29
from restaurants where nom = 'Chez Lucette';
\set ON_ERROR_STOP 1
\echo '--- Poste libre : intitulé écrit par l''établissement, obligatoire'
insert into demandes (restaurant_id, poste, intitule, description_poste, jour, debut, fin, adresse, commune, lat, lng)
select id, 'autre', 'Voiturier', 'Accueil et stationnement des véhicules.', jour_reunion() + 3, 660, 900, '12 rue du Port', 'Le Port', -20.93, 55.29
from restaurants where nom = 'Chez Lucette' returning poste, intitule;
\set ON_ERROR_STOP 0
insert into demandes (restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng)
select id, 'autre', jour_reunion() + 3, 660, 900, '12 rue du Port', 'Le Port', -20.93, 55.29
from restaurants where nom = 'Chez Lucette';
\set ON_ERROR_STOP 1
\echo '--- Le Boucan ne voit pas l''établissement de Lucette'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select count(*) as visibles from restaurants where nom = 'Chez Lucette';
\echo '--- Le dernier gérant ne peut pas être retiré ; le membre d''équipe, si'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
\set ON_ERROR_STOP 0
select retirer_membre(id, '00000000-0000-0000-0000-0000000000a2') from restaurants where nom = 'Chez Lucette';
\set ON_ERROR_STOP 1
select retirer_membre(id, '00000000-0000-0000-0000-0000000000a4') from restaurants where nom = 'Chez Lucette';
select count(*) as membres from equipe_etablissement((select id from restaurants where nom = 'Chez Lucette'));
reset role;
\echo '--- Annulation après acceptation : Kévin voit la mission annulée et ne peut plus signer'
select d.id as dcuisine from demandes d join restaurants r on r.id = d.restaurant_id
where r.nom = 'Chez Lucette' and d.poste = 'cuisine' \gset
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select accepter_mission(:'dcuisine');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
update demandes set statut = 'annulee' where id = :'dcuisine';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select restaurant, annulee from mes_missions() where restaurant = 'Chez Lucette';
\set ON_ERROR_STOP 0
select signer_contrat((select affectation_id from contrat_extra(:'dcuisine')), repeat('k', 200));
\set ON_ERROR_STOP 1
reset role;
\echo '--- Compteur de l''équipe Kivien : refusé à un restaurateur, ouvert à un administrateur'
insert into admins (utilisateur_id) values ('00000000-0000-0000-0000-0000000000a3');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
\set ON_ERROR_STOP 0
select count(*) from statistiques_extras();
\set ON_ERROR_STOP 1
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select commune, competences, dispo_7_jours from statistiques_extras() order by commune;
select count(*) as etablissements from statistiques_etablissements();
reset role;
\echo '--- Espace administrateur : tableau de bord et listes'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select jsonb_pretty(admin_tableau(365) - 'par_mois') as tableau;
select jsonb_array_length(admin_tableau(365)->'par_mois') >= 1 as mois_presents;
select nom, demandes, places_pourvues, frais_ht_centimes from admin_etablissements() order by nom;
select prenom, missions, absences, desistements, note_moyenne from admin_extras() order by prenom;
select etablissement, poste, statut, pourvues from admin_demandes(5);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
\set ON_ERROR_STOP 0
select admin_tableau();
\set ON_ERROR_STOP 1
reset role;
\echo '--- Mes gains : missions avec contrat de Kévin (annulées exclues)'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select restaurant, poste, effectuee, contrat_signe_extra from mes_gains() order by jour, debut;
reset role;
\echo '--- Paiement : débit 24 h après la mission (extra venu), jamais pour un absent'
update reglages_paiement set debut = jour_reunion() - 90;
insert into demandes (id, restaurant_id, poste, jour, debut, fin, adresse, commune, lat, lng, nb_extras)
values ('00000000-0000-0000-0000-00000000d900', '00000000-0000-0000-0000-00000000b001', 'serveur', jour_reunion() - 3, 1080, 1320, 'x', 'Saint-Paul', -21.0, 55.27, 2),
       ('00000000-0000-0000-0000-00000000d901', '00000000-0000-0000-0000-00000000b001', 'plonge', jour_reunion(), 0, 1, 'x', 'Saint-Paul', -21.0, 55.27, 1),
       ('00000000-0000-0000-0000-00000000d902', '00000000-0000-0000-0000-00000000b001', 'serveur', date_trunc('month', jour_reunion())::date - 20, 1080, 1320, 'x', 'Saint-Paul', -21.0, 55.27, 1);
insert into affectations (demande_id, extra_id, statut) values
  ('00000000-0000-0000-0000-00000000d900', '00000000-0000-0000-0000-0000000000e1', 'terminee'),
  ('00000000-0000-0000-0000-00000000d900', '00000000-0000-0000-0000-0000000000e2', 'absente'),
  ('00000000-0000-0000-0000-00000000d901', '00000000-0000-0000-0000-0000000000e1', 'confirmee'),
  ('00000000-0000-0000-0000-00000000d902', '00000000-0000-0000-0000-0000000000e2', 'terminee');
select count(*) as sans_moyen from paiements_a_lancer('00000000-0000-0000-0000-00000000b001');
insert into moyens_paiement (restaurant_id, stripe_client, stripe_carte, carte_libelle)
values ('00000000-0000-0000-0000-00000000b001', 'cus_essai', 'pm_essai', 'Visa •••• 4242 · 12/28');
select a.demande_id, p.montant_ht_centimes, p.tva_centimes
from paiements_a_lancer('00000000-0000-0000-0000-00000000b001') p join affectations a on a.id = p.affectation_id
order by 1;
\echo '--- Facture mensuelle : le mois précédent, une seule fois'
update moyens_paiement set mode = 'mensuel_carte' where restaurant_id = '00000000-0000-0000-0000-00000000b001';
select mois = to_char(date_trunc('month', jour_reunion())::date - 20, 'YYYY-MM') as mois_precedent, mode, mises_en_relation, montant_ht_centimes, tva_centimes
from mois_a_facturer('00000000-0000-0000-0000-00000000b001');
insert into paiements (restaurant_id, type, mois, moyen, libelle, mises_en_relation, montant_ht_centimes, tva_centimes, montant_ttc_centimes)
select restaurant_id, 'mensuel', mois, 'carte', libelle, mises_en_relation, montant_ht_centimes, tva_centimes, montant_ht_centimes + tva_centimes
from mois_a_facturer('00000000-0000-0000-0000-00000000b001');
select count(*) as encore_a_facturer from mois_a_facturer('00000000-0000-0000-0000-00000000b001');
\echo '--- Le gérant voit son moyen de paiement et ce qui reste à régler ; un extra non'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select mode, carte_libelle from moyens_paiement;
select count(*) as paiements_visibles from paiements;
select mises_en_relation >= 1 as reste_a_regler from a_regler('00000000-0000-0000-0000-00000000b001');
\set ON_ERROR_STOP 0
select count(*) from paiements_a_lancer();
\set ON_ERROR_STOP 1
update moyens_paiement set stripe_carte = 'pm_pirate';
select stripe_carte from moyens_paiement;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select count(*) as moyens_visibles_extra from moyens_paiement;
reset role;
