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

  // Accueil : le concept, deux entrées (établissement, extra).
  await p.goto(URL_SITE + '/');
  await p.getByRole('heading', { name: 'Les extras péi, près de chez vous.' }).waitFor();
  await p.getByRole('link', { name: /Je recrute des extras/ }).first().waitFor();
  await p.getByRole('link', { name: /Je cherche des missions/ }).first().waitFor();
  await p.getByText('Côté établissement').waitFor();
  await p.getByText('Côté extra').waitFor(); ok('accueil : concept, deux entrées, comment ça marche des deux côtés');
  if (await p.locator('img[src*="aide-a-domicile"], img[src*="batiment"], img[src*="menage"], img[src*="nettoyage"]').count()) throw new Error('photo de métier non autorisé');
  ok('accueil : photos limitées aux métiers autorisés');
  await capture('accueil-concept');
  await p.getByRole('link', { name: /Je recrute des extras/ }).first().click();
  await p.waitForURL(URL_SITE + '/pro');

  // Page des établissements : montants tirés des paramètres, témoignages, lettre, accès à l'espace.
  await p.getByRole('heading', { name: /Un extra pour aujourd'hui, environ 20\s%\smoins cher que l'intérim\./ }).waitFor(); ok('page pro : promesse, depuis l’accueil');
  await p.getByText(/81,25\s€\sbrut/).first().waitFor();
  await p.getByText(/^19,00\s€\sHT$/).waitFor(); ok('page pro : 6 h au SMIC = 81,25 € brut, frais 19 € HT');
  await p.getByText('Environ 20 % moins cher que l’intérim', { exact: false }).first().waitFor(); ok('page pro : comparaison avec l’intérim');
  if (await p.getByText(/Serveur|Barman|s'il ne vient pas|embauché/).count()) throw new Error('texte genré sur la page pro');
  if (await p.getByRole('button', { name: 'Témoignage suivant' }).count()) throw new Error('témoignages d’exemple affichés');
  ok('page pro : témoignages d’exemple masqués');
  await p.getByRole('heading', { name: 'Vous vous demandez peut-être…' }).waitFor();
  await p.getByText('Qui est l’employeur de l’extra ?').click();
  await p.getByText('Kivien trouve la personne et prépare le contrat', { exact: false }).first().waitFor(); ok('page pro : questions fréquentes dépliables');
  await p.getByLabel('Votre e-mail').fill('pas-une-adresse');
  await p.getByRole('button', { name: "S'inscrire" }).click();
  await p.getByText('Indiquez une adresse e-mail valide.').waitFor(); ok('lettre : adresse invalide refusée');
  await p.getByLabel('Votre e-mail').fill('lucette.hoarau@exemple.re');
  await p.getByRole('button', { name: "S'inscrire" }).click();
  await p.getByText('Inscription enregistrée.', { exact: false }).waitFor(); ok('lettre : inscription enregistrée');
  await capture('vitrine');
  await p.getByRole('link', { name: 'Se connecter' }).first().click();
  await p.waitForURL(URL_SITE + '/connexion'); ok('page pro : lien Se connecter');

  // Pages légales, questions fréquentes et présentation, reliées depuis le pied de page.
  for (const [chemin, titre] of [
    ['/mentions-legales', 'Mentions légales'],
    ['/conditions', 'Conditions générales d’utilisation et de vente'],
    ['/confidentialite', 'Politique de confidentialité'],
    ['/cookies', 'Cookies et stockage'],
    ['/questions-frequentes', 'Vous vous demandez peut-être…'],
    ['/qui-sommes-nous', 'Qui sommes-nous'],
  ]) {
    await p.goto(URL_SITE + chemin);
    await p.getByRole('heading', { level: 1, name: titre }).waitFor();
    if (!(await p.locator(`footer a[href="${chemin}"]`).count())) throw new Error('lien absent du pied : ' + chemin);
  }
  await p.goto(URL_SITE + '/mentions-legales');
  await p.getByText('884 270 604 00025', { exact: false }).first().waitFor();
  ok('pages légales, questions fréquentes, qui sommes-nous : en ligne et reliées au pied de page');

  // Recrutement des extras : page des annonces, inscription dans l'app.
  await p.goto(URL_SITE + '/extras');
  await p.getByRole('heading', { name: 'Des missions près de chez toi. Tu choisis tes soirées.' }).waitFor();
  if (!(await p.getByRole('link', { name: "Je m'inscris" }).first().getAttribute('href')).endsWith('/bienvenue')) throw new Error('lien inscription extra');
  await p.getByText('Animation', { exact: true }).waitFor();
  await p.getByText('Un vrai contrat, une fiche de paie et tes congés payés en plus, à chaque mission.').waitFor();
  if (await p.getByText(/€\snet/).count()) throw new Error('montant affiché sur la page extras');
  ok('page extras : métiers autorisés, contrat et fiche de paie (sans montant), inscription dans l’app');
  await capture('page-extras');

  // Compteur de l'équipe Kivien (démo) : extras par zone et par métier.
  await p.goto(URL_SITE + '/admin');
  await p.getByRole('heading', { name: "Vue d'ensemble" }).waitFor();
  await p.getByText("Chiffre d'affaires HT").waitFor();
  await p.getByText('Taux de pourvoi').waitFor(); ok('admin : vue d’ensemble (valeur, demande, offre, qualité)');
  await capture('admin');
  await p.getByRole('radio', { name: '12 mois' }).click();
  await p.getByText('Mois par mois').waitFor(); ok('admin : période de 12 mois, évolution mensuelle');
  await p.getByRole('button', { name: 'Extras', exact: true }).click();
  await p.getByRole('row', { name: /Kévin Hoarau/ }).waitFor();
  await p.getByRole('searchbox').fill('maelle');
  if (await p.getByRole('row', { name: /Kévin Hoarau/ }).count()) throw new Error('recherche des extras');
  await p.getByRole('row', { name: /Maëlle Payet/ }).waitFor(); ok('admin : liste des extras, recherche sans accents');
  await p.getByRole('button', { name: 'Établissements', exact: true }).click();
  await p.getByRole('row', { name: /Village vacances Les Filaos/ }).waitFor(); ok('admin : liste des établissements');
  await p.getByRole('button', { name: 'Demandes', exact: true }).click();
  await p.getByRole('row', { name: /Le Boucan Grillé/ }).first().waitFor(); ok('admin : dernières demandes');
  await p.getByRole('button', { name: 'Recrutement', exact: true }).click();
  await p.getByRole('row', { name: /^Ouest/ }).first().waitFor(); ok('admin : recrutement par zone');
  // Prospection : import (échantillon OpenStreetMap en démonstration), e-mail ajouté à la main, campagne.
  await p.getByRole('button', { name: 'Prospection', exact: true }).click();
  await p.getByRole('button', { name: 'Chercher les établissements sur OpenStreetMap' }).click();
  await p.getByText('Recherche en cours sur OpenStreetMap', { exact: false }).waitFor(); ok('prospection : recherche demandée au serveur, avancement affiché');
  await p.getByText('4 établissements trouvés (4 nouveaux), 1 e-mail trouvé sur les sites.', { exact: false }).waitFor({ timeout: 15000 });
  await p.getByRole('row', { name: /Hôtel des Hauts/ }).waitFor(); ok('prospection : bilan de la recherche, fiches rechargées');
  await p.getByText('Trouvé sur le site').waitFor(); ok('prospection : origine de l’e-mail affichée');
  await p.getByRole('row', { name: /Ti Bar Lagon/ }).getByRole('button', { name: 'Ajouter un e-mail' }).click();
  await p.getByLabel('Ajouter un e-mail').fill('pas-une-adresse');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('Adresse e-mail invalide.').waitFor();
  await p.getByLabel('Ajouter un e-mail').fill('contact@tibarlagon.re');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('contact@tibarlagon.re').waitFor(); ok('prospection : e-mail ajouté à la main, adresse vérifiée');
  // Fiche d'essai ajoutée à la main, puis e-mail modifié.
  await p.getByRole('button', { name: 'Ajouter un établissement' }).click();
  await p.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await p.getByText('Indiquez le nom.').waitFor();
  await p.locator('#prospect-nom').fill('Test Emmanuel');
  await p.locator('#prospect-email').fill('essai@exemple.re');
  await p.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await p.getByText('Test Emmanuel ajouté à la liste.').waitFor();
  await p.getByRole('row', { name: /Test Emmanuel/ }).getByText('essai@exemple.re').waitFor(); ok('prospection : fiche d’essai ajoutée, liste filtrée sur son nom');
  await p.getByRole('button', { name: 'Modifier : Test Emmanuel' }).click();
  await p.getByLabel('Ajouter un e-mail').fill('moi@exemple.re');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('moi@exemple.re').waitFor(); ok('prospection : e-mail modifié');
  await p.getByText('1 établissement avec e-mail dans la sélection').waitFor();
  await p.getByPlaceholder('Rechercher').fill('');
  await p.getByLabel('Toute l’île').selectOption('sud');
  await p.getByText('2 établissements avec e-mail dans la sélection').waitFor(); ok('prospection : filtre par zone (Sud : Saint-Philippe, Cilaos)');
  await p.getByLabel('Toute l’île').selectOption('');
  await p.getByText('4 établissements avec e-mail dans la sélection').waitFor();
  if (!(await p.locator('textarea').inputValue()).replace(/\s/g, ' ').includes('19,00 € HT par mise en relation')) throw new Error('frais absents du message');
  ok('prospection : message de lancement avec les frais en vigueur');
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: "Programmer l'envoi à 4 établissements" }).click();
  await p.getByText('4 e-mails programmés.').waitFor();
  await p.getByText('0 sur 4 envoyé · 4 en attente', { exact: false }).waitFor(); ok('prospection : campagne programmée, suivi des envois');
  await p.getByText('0 clic · 0 compte créé').waitFor();
  await p.getByRole('button', { name: 'Voir le suivi' }).click();
  await p.locator('table').last().getByRole('row', { name: /Le Cap Méchant/ }).getByText('Compte créé', { exact: true }).waitFor();
  await p.getByText('/, /extras, /inscription/restaurant').waitFor(); ok('prospection : suivi par établissement (clic, pages vues, compte créé)');
  await capture('prospection');

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
  await p.getByText('Choisissez un mot de passe de 8 caractères minimum.').waitFor();
  await p.getByText('Cochez la case pour accepter les conditions générales.').waitFor(); ok('inscription : champs obligatoires, conditions générales à accepter');
  await p.locator('#etablissement').fill('Le Cari Péi');
  await p.locator('#secteur').selectOption('hotellerie_restauration');
  await p.locator('#adresse').fill('22 rue Labourdonnais Saint-Paul');
  await p.locator('ul[role="listbox"] [role="option"]').first().click();
  await p.locator('#siret').fill('73282932000075');
  await p.locator('#telephone').fill('0692 11 22 33');
  await p.locator('#email').fill('contact@caripei.re');
  await p.locator('#mot-de-passe').fill('kivien974');
  await p.getByRole('button', { name: 'Créer mon compte' }).click();
  await p.getByText('Vérifiez le numéro SIRET : 14 chiffres.').waitFor(); ok('inscription : SIRET invalide refusé (clé de Luhn)');
  await p.locator('#siret').fill('73282932000074');
  await p.locator('#siret').blur();
  if ((await p.locator('#siret').inputValue()) !== '732 829 320 00074') throw new Error('SIRET non mis en forme');
  await p.getByRole('checkbox').check();
  if (await p.getByText('Cochez la case pour accepter les conditions générales.').count()) throw new Error('erreur CGU restée affichée');
  await capture('inscription');
  await p.getByRole('button', { name: 'Créer mon compte' }).click();
  await p.waitForURL(URL_SITE + '/espace'); ok('inscription : compte créé, espace ouvert');

  await p.goto(URL_SITE + '/espace');
  await p.getByRole('heading', { name: 'Le Boucan Grillé' }).waitFor();
  await p.getByRole('heading', { name: /extras? trouvés?/i }).waitFor();
  await p.getByText('Kévin a dit mi lé la').waitFor(); ok('accueil : encart « Extra trouvé » avec Kévin');
  await p.getByText('Extra trouvé · Kévin').waitFor(); ok('accueil : demande de ce soir, extra trouvé, contrat à signer');
  await p.getByText('Missions à noter').waitFor(); ok('accueil : mission à noter');
  await capture('accueil');

  // Demande : erreur puis envoi
  await p.getByRole('link', { name: 'Trouver un extra' }).first().click();
  await p.getByRole('heading', { name: 'Trouver un extra' }).waitFor();
  const adresse = p.locator('#adresse');
  await adresse.fill('');
  if (await p.locator('input[type=checkbox]').isChecked()) throw new Error('case retour cochée par défaut');
  ok('case retour décochée par défaut');
  await p.getByText('81,25 €').first().waitFor(); ok('récapitulatif : 1 extra par défaut, 81,25 € pour 6 h');
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
  await p.getByRole('button', { name: 'Un extra de plus' }).click();
  await p.getByText('178,20 €').waitFor(); ok('récapitulatif recalculé pour 2 extras à 13,50 € : 178,20 €');
  await p.getByRole('button', { name: 'Un extra de moins' }).click();
  await p.getByText('Versé par vous à l\'extra', { exact: false }).waitFor(); ok('récapitulatif recalculé pour 1 extra');
  await p.locator('#debut').fill('2000');
  await p.locator('#debut').blur();
  await p.getByText('4 heures de service.').waitFor(); ok('heure tapée « 2000 » → 20:00, 4 heures de service');
  // Poste libre : intitulé obligatoire, description facultative.
  await p.getByRole('radio', { name: 'Autre poste' }).click();
  await p.getByRole('button', { name: 'Trouver un extra' }).click();
  await p.getByText('Indiquez le poste.').waitFor(); ok('poste libre : intitulé obligatoire');
  await p.locator('#intitule').fill('Voiturier');
  await p.locator('#description-poste').fill('Accueil des clients et stationnement des véhicules.');
  await p.getByRole('radio', { name: /Demain/ }).click();
  await p.getByText('Je peux raccompagner').click();
  await p.getByRole('button', { name: 'Une semaine de plus' }).click();
  await p.getByRole('button', { name: 'Une semaine de plus' }).click();
  await p.getByText(/^3 missions, chaque \S+ jusqu’au /).waitFor(); ok('mission répétée : 3 semaines, même jour et mêmes horaires');
  await p.getByRole('button', { name: 'Une semaine de moins' }).click();
  await p.getByRole('button', { name: 'Une semaine de moins' }).click();
  await p.getByText('Une seule mission, ce jour-là.').waitFor();
  await capture('demande-remplie');
  await p.getByRole('button', { name: 'Trouver un extra' }).click();
  await p.getByText('Envoi de la demande').waitFor(); ok('envoi : bouton occupé, champs désactivés');
  await p.waitForURL(/\/demandes\//); ok('redirection vers le suivi');
  await p.getByText('Recherche en cours').first().waitFor(); ok('suivi : recherche en cours');
  await p.getByRole('heading', { name: 'Voiturier · 1 extra' }).waitFor();
  await p.getByText('Accueil des clients et stationnement des véhicules.').waitFor(); ok('suivi : intitulé et description du poste libre');
  await capture('suivi-recherche');
  await p.getByText('Maëlle a dit mi lé la. Arrivée prévue à 20 h.').waitFor({ timeout: 12000 }); ok('temps réel : « Maëlle a dit mi lé la. Arrivée prévue à 20 h. »');
  await p.getByText("Commis, Plonge · Moins d'un an de métier · Français, Créole, Anglais").waitFor();
  await p.getByText("« Rapide en plonge, à l'aise en cuisine. »").waitFor();
  await p.getByRole('img', { name: 'Photo de Maëlle' }).waitFor(); ok('suivi : profil de Maëlle (postes, expérience, langues, présentation, initiales)');
  await p.getByText('Première mission sur Kivien').waitFor(); ok('suivi : badges de confiance d’un extra sans historique');
  await capture('suivi-trouve');

  // Contrat
  await p.getByRole('link', { name: /Signer le contrat/ }).click();
  await p.getByRole('heading', { name: "Contrat d'extra" }).waitFor();
  await p.getByText('Taux horaire brut : 13,50 €').waitFor(); ok('contrat prérempli avec le taux saisi');
  await p.getByText('Voiturier. Accueil des clients et stationnement des véhicules.', { exact: false }).waitFor(); ok('contrat : emploi = poste libre et sa description');
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
  const [telechargement] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Télécharger le contrat en PDF' }).click()]);
  const cheminPdf = await telechargement.path();
  const pdf = require('fs').readFileSync(cheminPdf);
  if (!telechargement.suggestedFilename().endsWith('.pdf') || pdf.subarray(0, 4).toString() !== '%PDF' || pdf.length < 3000) throw new Error('PDF du contrat invalide');
  if (CAPTURES) require('fs').copyFileSync(cheminPdf, `${CAPTURES}/contrat.pdf`);
  ok(`contrat téléchargé en PDF (${telechargement.suggestedFilename()}, ${Math.round(pdf.length / 1024)} Ko)`);
  await capture('contrat-signe');
  // Contrat signé : on le retrouve depuis le suivi, avec les infos de la DPAE.
  await p.goto(URL_SITE + new URL(p.url()).pathname.replace(/\/contrat$/, ''));
  await p.getByRole('link', { name: 'Contrat et DPAE' }).first().click();
  await p.getByRole('link', { name: 'Faire la DPAE' }).waitFor(); ok('suivi : contrat signé et DPAE accessibles');

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

  // Paiement des frais : carte (page Stripe simulée), mode, prélèvement SEPA, paiement refusé relancé.
  await p.goto(URL_SITE + '/paiement');
  await p.getByRole('heading', { name: 'Paiement', exact: true }).waitFor();
  await p.getByText('Frais Kivien : 19,00 € HT par mise en relation', { exact: false }).waitFor(); ok('paiement : frais lus dans les paramètres');
  await p.getByText('Enregistrez un moyen de paiement pour régler vos missions.').waitFor(); ok('paiement : missions en attente sans moyen de paiement');
  await p.getByRole('radio', { name: /Facture mensuelle par prélèvement SEPA/ }).click();
  await p.getByText('Mettez d’abord en place le prélèvement SEPA.').waitFor(); ok('paiement : mode SEPA refusé sans mandat');
  await p.getByRole('button', { name: 'Enregistrer une carte' }).click();
  await p.getByText('Carte enregistrée.').waitFor();
  await p.getByText('Visa •••• 4242 · 12/28').waitFor(); ok('paiement : carte enregistrée au retour de la page Stripe');
  await p.getByRole('radio', { name: /Facture mensuelle par carte/ }).click();
  await p.getByText('Mode de paiement enregistré.').waitFor();
  if ((await p.getByRole('radio', { name: /Facture mensuelle par carte/ }).getAttribute('aria-checked')) !== 'true') throw new Error('mode non coché');
  ok('paiement : facture mensuelle par carte choisie');
  await p.getByText('Votre carte a été refusée.').waitFor();
  await p.getByRole('button', { name: 'Réessayer' }).click();
  await p.getByText('Payé').nth(1).waitFor(); ok('paiement : paiement refusé relancé, payé');
  await capture('paiement');
  await p.getByRole('button', { name: 'Mettre en place le prélèvement' }).click();
  await p.getByText('Prélèvement SEPA en place.').waitFor();
  await p.getByText('IBAN •••• 1234').waitFor(); ok('paiement : mandat SEPA au retour de la page GoCardless');
  // Mandat signé : le prélèvement prend le rythme du mode en cours (ici, à chaque mission).
  if ((await p.getByRole('radio', { name: /Prélèvement SEPA, à chaque mission/ }).getAttribute('aria-checked')) !== 'true') throw new Error('mode SEPA à la mission non coché');
  ok('paiement : prélèvement SEPA à chaque mission choisi avec le mandat');
  await p.getByRole('radio', { name: /Facture mensuelle par prélèvement SEPA/ }).click();
  await p.getByText('Mode de paiement enregistré.').waitFor(); ok('paiement : bascule en facture mensuelle SEPA');
  await p.goto(URL_SITE + '/historique');
  await p.getByRole('heading', { name: 'Historique' }).waitFor();
  await capture('historique');

  // Photo de l'extra côté restaurateur
  await p.goto(URL_SITE + '/demandes/d001');
  const photoKevin = p.getByRole('img', { name: 'Photo de Kévin' });
  await photoKevin.waitFor();
  await p.waitForFunction(() => { const i = document.querySelector('img[alt="Photo de Kévin"]'); return i && i.complete && i.naturalWidth > 0; });
  ok('suivi : photo de Kévin affichée');
  await p.getByText('6 missions réalisées sur Kivien').waitFor();
  await p.getByText(/^Note 4,8\ssur\s5$/).waitFor(); ok('suivi : badges de confiance de Kévin (missions, note)');
  await p.goto(URL_SITE + '/demandes/d100');
  await p.getByText(/Arrivée pointée à 17\sh\s56 · départ à 23\sh\s58/).waitFor(); ok('suivi : pointage de Maëlle (arrivée et départ)');

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

  // Mot de passe oublié et Mon compte (adresse e-mail confirmée par lien).
  await p.goto(URL_SITE + '/connexion');
  await p.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
  await p.waitForURL(URL_SITE + '/mot-de-passe-oublie');
  await p.locator('#email').fill('pas-une-adresse');
  await p.getByRole('button', { name: 'Recevoir le lien' }).click();
  await p.getByText('Indiquez une adresse e-mail valide.').waitFor();
  await p.locator('#email').fill('contact@boucan.re');
  await p.getByRole('button', { name: 'Recevoir le lien' }).click();
  await p.getByText('Si un compte utilise cette adresse', { exact: false }).waitFor(); ok('mot de passe oublié : lien demandé par e-mail');
  await p.goto(URL_SITE + '/compte');
  await p.locator('#compte-email').fill('gerance@boucan.re');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('Lien de confirmation envoyé à gerance@boucan.re', { exact: false }).first().waitFor(); ok('mon compte : adresse e-mail à confirmer');

  // Grand écran : pas de débordement
  for (const w of [360, 768, 1024, 1440]) {
    await p.setViewportSize({ width: w, height: 900 });
    for (const u of ['/', '/extras', '/admin', '/compte', '/mot-de-passe-oublie', '/email-confirme', '/inscription', '/inscription/restaurant', '/connexion', '/invitation', '/planning', '/etablissements', '/utilisateurs', '/pro', '/paiement', '/desinscription?j=demo', '/mentions-legales', '/conditions', '/confidentialite', '/cookies', '/questions-frequentes', '/qui-sommes-nous', '/decouvrir/00000000-0000-0000-0000-000000000001', '/demande', '/historique', '/demandes/d001', '/demandes/d001/contrat?affectation=x']) {
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
