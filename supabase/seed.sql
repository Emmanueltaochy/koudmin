-- Données fictives (maquettes). Dates relatives : « ce soir » = aujourd'hui à La Réunion.
-- Coordonnées fictives, placées pour retrouver les distances de la maquette depuis l'extra de test.

insert into parametres (date_effet, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes)
values ('2026-01-01', 1231, 2500);

-- Comptes de test (connexion par SMS avec les numéros de config.toml, code 123456).
insert into auth.users (id, phone, aud, role)
values
  ('00000000-0000-0000-0000-0000000000e1', '262692000001', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', '262693000001', 'authenticated', 'authenticated');

insert into extras (id, prenom, telephone, commune, lat, lng, a_voiture)
values ('00000000-0000-0000-0000-0000000000e1', 'Kévin', '+262692000001', 'Saint-Paul', -21.03, 55.255, false);

insert into restaurants (id, proprietaire, nom, telephone) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'Le Boucan Grillé', '+262262000001'),
  ('00000000-0000-0000-0000-00000000b002', null, 'Ti Kaz Bar', '+262262000002'),
  ('00000000-0000-0000-0000-00000000b003', null, 'Chez Tatie Lucette', '+262262000003'),
  ('00000000-0000-0000-0000-00000000b004', null, 'Hôtel Les Filaos', '+262262000004');

insert into demandes (id, restaurant_id, poste, jour, debut, fin, adresse, code_postal, commune, acces,
                      lat, lng, retour_assure, bus_retour, tenue, nb_extras)
values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000b001', 'serveur',
   jour_reunion(), 1080, 0, '14 rue du Général de Gaulle', '97434', 'Saint-Gilles-les-Bains',
   'entrée du personnel côté cuisine', -21.039442, 55.237476, true, null,
   'Tenue noire. Chaussures fermées.', 1),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000b002', 'barman',
   jour_reunion() + 1, 1080, 60, '3 rue des Brisants', '97434', 'Saint-Gilles-les-Bains',
   null, -21.044625, 55.239329, true, null, 'Tenue noire.', 1),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-00000000b003', 'plonge',
   jour_reunion(), 1140, 1410, '22 rue Labourdonnais', '97460', 'Saint-Paul',
   null, -20.989435, 55.270813, false, 1215, 'Chaussures fermées.', 1),
  ('00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-00000000b004', 'commis',
   jour_reunion() + 1, 690, 900, '5 avenue de la Mer', '97434', 'L''Hermitage',
   null, -21.080704, 55.235221, false, 920, 'Tenue blanche.', 1);
