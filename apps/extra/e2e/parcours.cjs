// Parcours extra de bout en bout, sur l'export web avec données fictives.
// 1. pnpm --filter @kivien/extra export:web
// 2. npx serve -s apps/extra/dist -l 8090
// 3. node apps/extra/e2e/parcours.cjs   (nécessite le paquet playwright et Chromium)
const { chromium } = require('playwright');
const URL_APP = process.env.URL_APP ?? 'http://localhost:8090';

(async () => {
  const b = await chromium.launch();
  const p = (globalThis.__page = await b.newPage({ viewport: { width: 390, height: 800 } }));
  const logs = [];
  p.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') logs.push('CONSOLE ' + m.text().slice(0, 200)); });
  // Parcours complet au clic, depuis la liste.
  const etape = async (txt) => console.log('OK  ' + txt);
  await p.goto(URL_APP + '/');
  await p.getByText('Le Boucan Grillé').waitFor();
  await p.getByText('Le Boucan Grillé').click();
  await p.getByText('Adresse exacte après confirmation.').waitFor(); await etape('détail ouvert, adresse cachée');
  await p.getByText('Mi lé la', { exact: true }).click();
  await p.getByText('On prévient le restaurant').waitFor(); await etape('envoi affiché');
  await p.getByText("C'est confirmé.", { exact: false }).waitFor({ timeout: 5000 }); await etape('confirmé');
  await p.getByText('14 rue du Général de Gaulle').waitFor(); await etape('adresse exacte visible après confirmation');
  const contrat = await p.getByText("Contrat d'extra à signer", { exact: false }).count();
  console.log(contrat === 0 ? 'OK  ligne contrat masquée' : 'ÉCHEC ligne contrat encore visible');
    await p.getByText('Je ne peux plus venir').click();
  await p.getByText('Tu ne viens plus ce soir', { exact: false }).waitFor(); await etape('écran désistement');
  await p.getByText('Annuler', { exact: true }).click();
  await p.getByText("C'est confirmé.", { exact: false }).waitFor(); await etape('Annuler ramène à la mission confirmée');
  await p.getByText('Je ne peux plus venir').click();
  await p.getByText('Confirmer', { exact: true }).click();
  await p.getByText('4 missions près de toi', { exact: false }).waitFor({ timeout: 8000 }); await etape('mission libérée, retour à la liste (4 missions)');
  // Accepter puis revenir : la mission disparaît de la liste.
  await p.getByText('Le Boucan Grillé').click();
  await p.getByText('Mi lé la', { exact: true }).click();
  await p.getByText("C'est confirmé.", { exact: false }).waitFor({ timeout: 5000 });
  await p.getByLabel('Retour').first().click();
  await p.getByText('3 missions près de toi', { exact: false }).waitFor({ timeout: 8000 }); await etape('mission acceptée retirée de la liste (3 missions)');

  // Mission confirmée en tête de liste, puis contrat : infos DPAE une seule fois, signature au doigt.
  await p.getByText('Tes missions confirmées').waitFor();
  await p.getByText('Contrat à signer').waitFor(); await etape('liste : mission confirmée en tête, contrat à signer');
  if (process.env.CAPTURES) await p.screenshot({ path: `${process.env.CAPTURES}/missions-confirmees.png` });
  await p.getByText('Service en salle · Le Boucan Grillé').click();
  await p.getByText('Signer mon contrat').click();
  await p.getByText('Infos pour ton contrat').waitFor(); await etape('contrat : infos demandées avant la première signature');
  await p.getByText('Continuer').click();
  await p.getByText('Indique ta date de naissance.').waitFor(); await etape('contrat : champs obligatoires');
  const corps = '1010597415123';
  const nir = corps + String(97n - (BigInt(corps) % 97n)).padStart(2, '0');
  await p.getByLabel('Date de naissance').fill('12052001');
  await p.getByLabel('Lieu de naissance').fill('Saint-Paul (974)');
  await p.getByLabel('Numéro de sécurité sociale').fill('1234');
  await p.getByLabel('Adresse').fill('5 chemin des Vacoas, 97460 Saint-Paul');
  await p.getByText('Continuer').click();
  await p.getByText('Vérifie ton numéro de sécurité sociale.').waitFor(); await etape('contrat : clé du NIR vérifiée');
  await p.getByLabel('Numéro de sécurité sociale').fill(nir);
  await p.getByText('Continuer').click();
  await p.getByText('Kévin Hoarau, né·e le 12 mai 2001', { exact: false }).waitFor(); await etape('contrat prérempli (identité, date de naissance)');
  await p.getByText('Signer mon contrat').last().click();
  await p.getByText('Signe dans le cadre.').waitFor(); await etape('contrat : signature obligatoire');
  const pave = await p.getByLabel('Signe avec le doigt.').boundingBox();
  await p.mouse.move(pave.x + 30, pave.y + 100);
  await p.mouse.down();
  for (let i = 0; i < 12; i++) await p.mouse.move(pave.x + 40 + i * 20, pave.y + 60 + (i % 2) * 50, { steps: 3 });
  await p.mouse.up();
  await p.getByText("J'ai lu le contrat et je le signe.").click();
  await p.getByText('Signer mon contrat').last().click();
  await p.getByText('Contrat signé. Le restaurant reçoit', { exact: false }).waitFor({ timeout: 5000 }); await etape('contrat signé');
  if (process.env.CAPTURES) await p.screenshot({ path: `${process.env.CAPTURES}/contrat-signe.png`, fullPage: true });

  // Retour à la liste par la navigation (un rechargement effacerait l'état de démo, gardé en mémoire).
  await p.getByLabel('Retour').last().click();
  await p.getByLabel('Retour').last().click();
  await p.getByText('Contrat signé').waitFor(); await etape('liste : contrat signé sur la mission confirmée');

  // Dispos
  await p.getByText('Dispos', { exact: true }).click();
  await p.getByText('Mes dispos').waitFor();
  const soirDemain = p.getByRole('checkbox', { name: 'Demain, Soir' });
  if ((await soirDemain.getAttribute('aria-checked')) !== 'true') throw new Error('dispo de démo absente');
  await p.getByRole('checkbox', { name: "Aujourd'hui, Soir" }).click();
  await p.getByText('Enregistré.').waitFor(); await etape('dispos : créneau enregistré à l’appui');
  if (process.env.CAPTURES) await p.screenshot({ path: `${process.env.CAPTURES}/dispos.png` });

  // Profil : voiture
  await p.getByText('Profil', { exact: true }).click();
  await p.getByText('Kévin Hoarau').waitFor();
  await p.getByRole('radio', { name: 'Oui' }).click();
  await p.getByText('Enregistré.').last().waitFor(); await etape('profil : voiture enregistrée');
  await p.getByText('Infos enregistrées.').waitFor(); await etape('profil : infos du contrat enregistrées');
  if (process.env.CAPTURES) await p.screenshot({ path: `${process.env.CAPTURES}/profil.png`, fullPage: true });
  await p.getByText('Missions', { exact: true }).last().click();
  await p.getByText('Saint-Paul · avec voiture').waitFor(); await etape('liste : profil avec voiture pris en compte');

  // Connexion par mot de passe (démo : kivien974)
  await p.goto(URL_APP + '/connexion');
  await p.getByLabel('Numéro de téléphone').fill('0692 00 00 01');
  await p.getByText('Se connecter').click();
  await p.getByText('Indique ton mot de passe.').waitFor(); await etape('connexion : mot de passe obligatoire');
  await p.getByLabel('Mot de passe').fill('mauvais-mdp');
  await p.getByText('Se connecter').click();
  await p.getByText('Numéro ou mot de passe incorrect.').waitFor(); await etape('connexion : mauvais mot de passe refusé');
  if (process.env.CAPTURES) await p.screenshot({ path: `${process.env.CAPTURES}/connexion.png`, fullPage: true });
  await p.getByLabel('Mot de passe').fill('kivien974');
  await p.getByText('Se connecter').click();
  await p.getByText('missions près de toi', { exact: false }).waitFor({ timeout: 8000 }); await etape('connexion réussie');

  // Inscription
  await p.goto(URL_APP + '/bienvenue');
  await p.getByText('Bienvenue sur Kivien').waitFor();
  await p.getByText('Créer mon compte').click();
  await p.getByText('Indique ton prénom.').waitFor(); await etape('inscription : champs obligatoires');
  await p.getByText('Choisis un mot de passe de 8 caractères minimum.').waitFor(); await etape('inscription : mot de passe obligatoire');
  await p.getByLabel('Prénom').fill('Johan');
  await p.getByLabel('Nom', { exact: true }).fill('Grondin');
  await p.getByLabel('Téléphone').fill('0693 00 00 01');
  await p.getByLabel('Mot de passe').fill('1234567');
  await p.getByLabel(/Commune/).click();
  await p.getByRole('radio', { name: 'Le Port' }).click();
  await p.getByRole('radio', { name: 'Non' }).last().click();
  await p.getByText('Choisis un mot de passe de 8 caractères minimum.').waitFor(); await etape('inscription : mot de passe trop court refusé');
  await p.getByLabel('Mot de passe').fill('mi lé la 974');
  if (process.env.CAPTURES) await p.screenshot({ path: `${process.env.CAPTURES}/inscription.png`, fullPage: true });
  await p.getByText('Créer mon compte').click();
  await p.getByText('Ce numéro a déjà un compte. Connecte-toi.').waitFor(); await etape('inscription : numéro déjà inscrit signalé');
  await p.getByLabel('Téléphone').fill('0693 00 00 02');
  await p.getByText('Créer mon compte').click();
  await p.getByText('Le Port · sans voiture').waitFor({ timeout: 8000 }); await etape('inscription terminée : profil Le Port, sans voiture');

  if (logs.length) {
    console.log(logs.join('\n'));
    process.exit(1);
  }
  console.log('aucune erreur console');
  await b.close();
})().catch(async (e) => {
  console.log('ÉCHEC ' + e.message.split('\n')[0]);
  if (process.env.CAPTURES && globalThis.__page) await globalThis.__page.screenshot({ path: `${process.env.CAPTURES}/echec.png` });
  process.exit(1);
});
