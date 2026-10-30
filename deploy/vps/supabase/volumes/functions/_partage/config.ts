// Configuration lue dans l'environnement du conteneur (deploy/vps/configurer-paiement.sh).

import { base } from './base.ts';
import { clientGoCardless } from './gocardless.ts';
import type { Services } from './prelevements.ts';
import { clientStripe } from './stripe.ts';

export function lireEnv(nom: string): string | undefined {
  return Deno.env.get(nom) || undefined;
}

export function services(): Services {
  const stripe = lireEnv('STRIPE_SECRET_KEY');
  const gocardless = lireEnv('GOCARDLESS_ACCESS_TOKEN');
  return {
    base: base(lireEnv('SUPABASE_URL')!, lireEnv('SUPABASE_SERVICE_ROLE_KEY')!),
    stripe: stripe ? clientStripe(stripe) : null,
    gocardless: gocardless ? clientGoCardless(gocardless, lireEnv('GOCARDLESS_ENV') === 'live' ? 'live' : 'sandbox') : null,
  };
}

export const SITE = lireEnv('KIVIEN_SITE') ?? 'https://kivien.re';

const ORIGINES = new Set([SITE, 'https://www.kivien.re', 'http://localhost:3000']);

export function cors(req: Request): Record<string, string> {
  const origine = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINES.has(origine) ? origine : SITE,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json', ...cors(req) } });
}
