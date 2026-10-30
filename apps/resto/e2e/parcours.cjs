// Parcours restaurateur de bout en bout, données fictives.
// 1. pnpm --filter @kivien/resto build && pnpm --filter @kivien/resto start
// 2. node apps/resto/e2e/parcours.cjs   (nécessite playwright + Chromium)
// CAPTURES=<dossier> pour enregistrer les captures de chaque écran.
const { chromium } = require('playwright');
const URL_SITE = process.env.URL_SITE ?? 'http://localhost:3000';
const CAPTURES = process.env.CAPTURES;

let pageCourante = null;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR' });
  const p = await ctx.newPage();
  pageCourante = p;
  // Heure figée à 14 h (La Réunion), date du jour : les missions « ce soir » restent à venir,
  // le parcours donne le même résultat quelle que soit l'heure du lancement.
  const jourReunion = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
  await p.clock.setFixedTime(new Date(`${jourReunion}T14:00:00+04:00`));
  const logs = [];
  p.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) logs.push('CONSOLE ' + m.text().slice(0, 200)); });
  const ok = (t) => console.log('OK  ' + t);
  const capture = async (nom) => CAPTURES && p.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: true });

  // Page d'accueil publique : montants tirés des paramètres, témoignages, lettre, accès à l'espace.
  await p.goto(URL_SITE + '/');
  await p.getByRole('heading', { name: 'Un extra en 2 heures.' }).waitFor(); ok('accueil public : promesse');
  await p.getByText(/81,25\s€\sbrut, congés payés compris/).waitFor();
  await p.getByText(/≈\s63\s€\snet/).waitFor();
  await p.getByText(/^25,00\s€\sHT$/).waitFor(); ok('accueil public : 6 h au SMIC = 81,25 € brut, ≈ 63 € net, frais 25 € HT');
  if (await p.getByText(/Serveur|Barman|s'il ne vient pas|embauché/).count()) throw new Error('texte genré sur la page d’accueil');
  await p.getByRole('button', { name: 'Témoignage suivant' }).click();
  await p.locator('[aria-hidden="false"]', { hasText: 'Je coche mes soirées libres' }).waitFor(); ok('accueil public : témoignage suivant');
  await p.getByRole('button', { name: 'Témoignage précédent' }).click();
  await p.locator('[aria-hidden="false"]', { hasText: 'il me manquait un commis' }).waitFor(); ok('accueil public : témoignage précédent');
  await p.getByLabel('Votre e-mail').fill('pas-une-adresse');
  await p.getByRole('button', { name: "S'inscrire" }).click();
  await p.getByText('Indiquez une adresse e-mail valide.').waitFor(); ok('lettre : adresse invalide refusée');
  await p.getByLabel('Votre e-mail').fill('lucette.hoarau@exemple.re');
  await p.getByRole('button', { name: "S'inscrire" }).click();
  await p.getByText('Inscription enregistrée.', { exact: false }).waitFor(); ok('lettre : inscription enregistrée');
  await capture('vitrine');
  await p.getByRole('link', { name: 'Se connecter' }).first().click();
  await p.waitForURL(URL_SITE + '/connexion'); ok('accueil public : lien Se connecter');

  // Création de compte restaurateur : SIRET obligatoire, compte actif tout de suite.
  await p.goto(URL_SITE + '/');
  await p.getByRole('link', { name: 'Créer un compte' }).first().click();
  await p.waitForURL(URL_SITE + '/inscription'); ok('accueil public : bouton Créer un compte');
  await p.getByRole('link', { name: /Je cherche des missions/ }).waitFor();
  await p.getByRole('link', { name: /Je cherche des extras/ }).click();
  await p.waitForURL(URL_SITE + '/inscription/restaurant');
  await p.getByRole('button', { name: 'Créer mon compte' }).click();
  await p.getByText("Indiquez le nom de l'établissement.").waitFor();
  await p.getByText("Choisissez le secteur d'activité.").waitFor();
  await p.getByText("Choisissez l'adresse dans la liste.").waitFor();
  await p.getByText('Vérifiez le numéro SIRET : 14 chiffres.').waitFor();
  await p.getByText('Choisissez un mot de passe de 8 caractères minimum.').waitFor(); ok('inscription : champs obligatoires');
  await p.locator('#etablissement').fill('Le Cari Péi');
  await p.locator('#secteur').selectOption('hotellerie_restauration');
  await p.locator('#adresse').fill('22 rue Labourdonnais Saint-Paul');
  await p.locator('ul[role="listbox"] [role="option"]').first().click();
  await p.locator('#siret').fill('73282932000075');
  await p.locator('#telephone').fill('0692 11 22 33');
  await p.locator('#mot-de-passe').fill('kivien974');
  await p.getByRole('button', { name: 'Créer mon compte' }).click();
  await p.getByText('Vérifiez le numéro SIRET : 14 chiffres.').waitFor(); ok('inscription : SIRET invalide refusé (clé de Luhn)');
  await p.locator('#siret').fill('73282932000074');
  await p.locator('#siret').blur();
  if ((await p.locator('#siret').inputValue()) !== '732 829 320 00074') throw new Error('SIRET non mis en forme');
  await capture('inscription');
  await p.getByRole('button', { name: 'Créer mon compte' }).click();
  await p.waitForURL(URL_SITE + '/espace'); ok('inscription : compte créé, espace ouvert');

  await p.goto(URL_SITE + '/espace');
  await p.getByRole('heading', { name: 'Le Boucan Grillé' }).waitFor();
  await p.getByText('Contrat à signer · Kévin').waitFor(); ok('accueil : demande de ce soir, contrat à signer');
  await p.getByText('Missions à noter').waitFor(); ok('accueil : mission à noter');
  await capture('accueil');

  // Demande : erreur puis envoi
  await p.getByRole('link', { name: 'Trouver un extra' }).first().click();
  await p.getByRole('heading', { name: 'Trouver un extra' }).waitFor();
  const adresse = p.locator('#adresse');
  await adresse.fill('');
  if (await p.locator('input[type=checkbox]').isChecked()) throw new Error('case retour cochée par défaut');
  ok('case retour décochée par défaut');
  await p.getByText('162,50 €').waitFor(); ok('récapitulatif : 162,50 € pour 2 × 6 h');
  await p.locator('#taux').fill('12');
  await p.getByRole('button', { name: 'Trouver un extra' }).click();
  await p.getByText('2 champs à compléter.').waitFor(); ok('erreur : 2 champs à compléter (adresse, taux sous le SMIC)');
  await p.getByText("Indiquez l'adresse du service.").waitFor();
  await p.getByText("Minimum légal : 12,31 € de l'heure.").waitFor();
  await capture('demande-erreur');
  await p.locator('#taux').fill('13,50');
  await p.getByText('1 champ à compléter.').waitFor(); ok('le résumé se met à jour pendant la correction');
  await adresse.fill('22 rue Labourdonnais Saint-Paul');
  await p.getByRole('option').first().waitFor({ timeout: 10000 });
  await p.locator('ul[role="listbox"] [role="option"]').first().click(); ok('proposition d’adresse choisie (Géoplateforme)');
  await p.getByRole('button', { name: 'Un extra de moins' }).click();
  await p.getByText('Versé par vous à l\'extra', { exact: false }).waitFor(); ok('récapitulatif recalculé pour 1 extra');
  await p.locator('#debut').fill('2000');
  await p.locator('#debut').blur();
  await p.getByText('4 heures de service.').waitFor(); ok('heure tapée « 2000 » → 20:00, 4 heures de service');
  await p.getByRole('radio', { name: /Demain/ }).click();
  await p.getByText('Je peux raccompagner').click();
  await capture('demande-remplie');
  await p.getByRole('button', { name: 'Trouver un extra' }).click();
  await p.getByText('Envoi de la demande').waitFor(); ok('envoi : bouton occupé, champs désactivés');
  await p.waitForURL(/\/demandes\//); ok('redirection vers le suivi');
  await p.getByText('Recherche en cours').first().waitFor(); ok('suivi : recherche en cours');
  await capture('suivi-recherche');
  await p.getByText('Maëlle a dit mi lé la. Arrivée prévue à 20 h.').waitFor({ timeout: 12000 }); ok('temps réel : « Maëlle a dit mi lé la. Arrivée prévue à 20 h. »');
  await p.getByText("Commis, Plonge · Moins d'un an de métier · Français, Créole, Anglais").waitFor();
  await p.getByText("« Rapide en plonge, à l'aise en cuisine. »").waitFor();
  await p.getByRole('img', { name: 'Photo de Maëlle' }).waitFor(); ok('suivi : profil de Maëlle (postes, expérience, langues, présentation, initiales)');
  await capture('suivi-trouve');

  // Contrat
  await p.getByRole('link', { name: /Signer le contrat/ }).click();
  await p.getByRole('heading', { name: "Contrat d'extra" }).waitFor();
  await p.getByText('Taux horaire brut : 13,50 €').waitFor(); ok('contrat prérempli avec le taux saisi');
  await p.getByRole('button', { name: 'Signer le contrat' }).click();
  await p.getByText('Signez dans le cadre avant de valider.').waitFor(); ok('signature obligatoire');
  const pave = await p.locator('canvas').boundingBox();
  await p.mouse.move(pave.x + 30, pave.y + 100);
  await p.mouse.down();
  for (let i = 0; i < 12; i++) await p.mouse.move(pave.x + 40 + i * 20, pave.y + 60 + (i % 2) * 50);
  await p.mouse.up();
  await p.getByText("J'ai lu le contrat et je le signe.").click();
  await p.getByRole('button', { name: 'Signer le contrat' }).click();
  await p.getByText('Dernière étape : la DPAE').waitFor(); ok('contrat signé, rappel DPAE affiché');
  const lien = await p.getByRole('link', { name: 'Faire la DPAE' }).getAttribute('href');
  if (lien !== 'https://www.net-entreprises.fr/declaration/dpae/') throw new Error('lien DPAE ' + lien);
  ok('lien DPAE vers net-entreprises.fr');
  await capture('contrat-signe');

  // Notation de la mission d'hier
  await p.goto(URL_SITE + '/espace');
  await p.getByRole('link', { name: /Maëlle Payet/ }).click();
  await p.getByRole('heading', { name: 'Noter la mission' }).waitFor();
  await p.getByRole('radio', { name: 'Oui' }).click();
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('Choisissez une note.').waitFor(); ok('note obligatoire si présent');
  await p.getByRole('radio', { name: '5 sur 5' }).click();
  await p.getByText('Ajouter à mes favoris').click();
  await capture('notation');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.waitForURL(/\/demandes\/d100$/); ok('notation enregistrée');

  // Historique, favoris, factures
  await p.goto(URL_SITE + '/historique?onglet=favoris');
  await p.getByText('Maëlle Payet').waitFor();
  await p.getByText('Kévin Hoarau').waitFor(); ok('favoris : Kévin et Maëlle');
  await capture('favoris');
  await p.getByRole('link', { name: 'Factures' }).last().click();
  await p.getByText('Voir la facture').first().waitFor(); ok('factures listées');
  await capture('factures');
  await p.getByText('Voir la facture').first().click();
  await p.getByText('TVA 8,5 %').waitFor(); ok('facture : TVA 8,5 %');
  await capture('facture');
  await p.goto(URL_SITE + '/historique');
  await p.getByRole('heading', { name: 'Historique' }).waitFor();
  await capture('historique');

  // Photo de l'extra côté restaurateur
  await p.goto(URL_SITE + '/demandes/d001');
  const photoKevin = p.getByRole('img', { name: 'Photo de Kévin' });
  await photoKevin.waitFor();
  await p.waitForFunction(() => { const i = document.querySelector('img[alt="Photo de Kévin"]'); return i && i.complete && i.naturalWidth > 0; });
  ok('suivi : photo de Kévin affichée');

  // Connexion (démo : mot de passe kivien974)
  await p.goto(URL_SITE + '/connexion');
  await p.locator('#telephone').fill('0612345678');
  await p.locator('#mot-de-passe').fill('kivien974');
  await p.getByRole('button', { name: 'Se connecter' }).click();
  await p.getByText('Indiquez un mobile réunionnais', { exact: false }).waitFor(); ok('connexion : numéro hors Réunion refusé');
  await p.locator('#telephone').fill('0692 00 00 01');
  await p.locator('#mot-de-passe').fill('');
  await p.getByRole('button', { name: 'Se connecter' }).click();
  await p.getByText('Indiquez votre mot de passe.').waitFor(); ok('connexion : mot de passe obligatoire');
  await p.locator('#mot-de-passe').fill('mauvais-mdp');
  await p.getByRole('button', { name: 'Se connecter' }).click();
  await p.getByText('Numéro ou mot de passe incorrect.').waitFor(); ok('mauvais mot de passe refusé');
  await capture('connexion');
  await p.locator('#mot-de-passe').fill('kivien974');
  await p.getByRole('button', { name: 'Se connecter' }).click();
  await p.waitForURL(URL_SITE + '/espace'); ok('connexion par mot de passe (démo)');

  // Suivi : appeler ou écrire à l'extra en un geste.
  await p.goto(URL_SITE + '/demandes/d001');
  if ((await p.getByRole('link', { name: 'Écrire' }).getAttribute('href')) !== 'sms:+262692000001') throw new Error('lien Écrire');
  ok('suivi : boutons Appeler et Écrire (SMS)');

  // Planning de la semaine : Kévin ce soir, avec ses boutons de contact.
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(URL_SITE + '/espace');
  const menu = p.locator('nav[aria-label="Navigation principale"]').last();
  await menu.getByRole('link', { name: 'Planning', exact: true }).click();
  await p.waitForURL(URL_SITE + '/planning');
  await p.getByRole('table').getByText('Kévin Hoarau').waitFor();
  await p.getByRole('table').getByRole('link', { name: 'Appeler Kévin' }).waitFor(); ok('planning : grille de la semaine, contact de Kévin');
  await capture('planning');
  await p.getByRole('button', { name: 'Semaine suivante' }).click();
  await p.getByRole('button', { name: 'Cette semaine' }).waitFor(); ok('planning : semaine suivante');

  // Plusieurs établissements : le village vacances n'a que les métiers de son secteur.
  await menu.locator('select').selectOption({ label: 'Village vacances Les Filaos' });
  await menu.getByRole('link', { name: 'Accueil', exact: true }).click();
  await p.getByRole('heading', { name: 'Village vacances Les Filaos' }).waitFor(); ok('choix de l’établissement : Les Filaos affiché');
  await menu.getByRole('link', { name: 'Demander un extra', exact: true }).click();
  await p.getByRole('radio', { name: 'Animation' }).waitFor();
  if (await p.getByRole('radio', { name: 'Salle' }).count()) throw new Error('métier hors secteur proposé');
  ok('demande : métiers du secteur loisirs et vacances seulement');
  await menu.getByRole('link', { name: 'Établissements', exact: true }).click();
  await p.getByText('Centres de loisirs et de vacances').waitFor();
  await p.getByRole('button', { name: 'Ajouter un établissement' }).click();
  await p.locator('section').getByRole('button', { name: 'Ajouter un établissement' }).click();
  await p.getByText("Choisissez le secteur d'activité.").waitFor(); ok('établissements : ajout, champs obligatoires');
  await p.locator('#nouvel-nom').fill('Ti Kaz Bar');
  await p.locator('#nouvel-secteur').selectOption('hotellerie_restauration');
  await p.locator('#nouvel-siret').fill('35600000000042');
  await p.locator('#nouvel-adresse').fill('22 rue Labourdonnais Saint-Paul');
  await p.locator('ul[role="listbox"] [role="option"]').first().click();
  await p.locator('section').getByRole('button', { name: 'Ajouter un établissement' }).click();
  await p.getByText('Établissement ajouté.').waitFor();
  await p.locator('main').getByText('Ti Kaz Bar').waitFor(); ok('établissements : Ti Kaz Bar ajouté et affiché');
  await capture('etablissements');
  await menu.locator('select').selectOption({ label: 'Le Boucan Grillé' });

  // Utilisateurs : invitation par mobile, puis la personne invitée crée son accès.
  await menu.getByRole('link', { name: 'Utilisateurs', exact: true }).click();
  await p.getByText('0693 44 55 66').waitFor();
  await p.locator('#invitation-mobile').fill('0692 99 88 77');
  await p.getByRole('button', { name: 'Inviter' }).click();
  await p.getByText('Invitation enregistrée.', { exact: false }).waitFor();
  await p.getByText('0692 99 88 77').waitFor(); ok('utilisateurs : invitation enregistrée, en attente');
  await p.locator('#invitation-mobile').fill('0692 00 00 01');
  await p.getByRole('button', { name: 'Inviter' }).click();
  await p.getByText('Ce numéro est un compte extra.').waitFor(); ok('utilisateurs : compte extra refusé');
  await capture('utilisateurs');
  await p.goto(URL_SITE + '/invitation');
  await p.locator('#telephone').fill('0693 44 55 66');
  await p.locator('#mot-de-passe').fill('kivien974');
  await p.getByRole('button', { name: 'Créer mon accès' }).click();
  await p.waitForURL(URL_SITE + '/espace'); ok('invitation : accès créé, espace ouvert');
  await p.setViewportSize({ width: 390, height: 844 });

  // Grand écran : pas de débordement
  for (const w of [360, 768, 1024, 1440]) {
    await p.setViewportSize({ width: w, height: 900 });
    for (const u of ['/', '/inscription', '/inscription/restaurant', '/connexion', '/invitation', '/planning', '/etablissements', '/utilisateurs', '/demande', '/historique', '/demandes/d001', '/demandes/d001/contrat?affectation=x']) {
      await p.goto(URL_SITE + u);
      await p.waitForTimeout(400);
      const deborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (deborde) throw new Error(`débordement horizontal ${u} à ${w} px`);
    }
  }
  ok('aucun débordement horizontal de 360 à 1440 px');

  if (logs.length) {
    console.log(logs.join('\n'));
    process.exit(1);
  }
  console.log('aucune erreur console');
  await b.close();
})().catch(async (e) => {
  console.log('ÉCHEC ' + e.message.split('\n')[0]);
  if (CAPTURES && pageCourante) await pageCourante.screenshot({ path: `${CAPTURES}/echec.png`, fullPage: true }).catch(() => undefined);
  process.exit(1);
});
