// Tâche horaire du VPS (/etc/cron.d/kivien-prelevements) : débits, factures mensuelles, statuts.
// Réservée à la clé de service : un appel depuis le site est refusé.

import { lireEnv, services } from '../_partage/config.ts';
import { lancerPrelevements } from '../_partage/prelevements.ts';

Deno.serve(async (req) => {
  const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const cle = lireEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (req.method !== 'POST' || !cle || jeton !== cle) return new Response('Refusé', { status: 403 });
  try {
    const bilan = await lancerPrelevements(services());
    console.log('prélèvements', JSON.stringify(bilan));
    return Response.json(bilan);
  } catch (e) {
    console.error('prélèvements', e instanceof Error ? e.message : e);
    return Response.json({ erreur: 'Prélèvements interrompus (voir le journal des fonctions).' }, { status: 500 });
  }
});
