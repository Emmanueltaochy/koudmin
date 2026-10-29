// Parcours extra de bout en bout, sur l'export web avec données fictives.
// 1. pnpm --filter @koudmin/extra export:web
// 2. npx serve -s apps/extra/dist -l 8090
// 3. node apps/extra/e2e/parcours.cjs   (nécessite le paquet playwright et Chromium)
const { chromium } = require('playwright');
const URL_APP = process.env.URL_APP ?? 'http://localhost:8090';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
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
  if (logs.length) {
    console.log(logs.join('\n'));
    process.exit(1);
  }
  console.log('aucune erreur console');
  await b.close();
})().catch((e) => {
  console.log('ÉCHEC ' + e.message.split('\n')[0]);
  process.exit(1);
});
