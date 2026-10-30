// Page « Paiement » de l'espace pro : enregistrer une carte (Stripe), mettre en place le prélèvement
// SEPA (GoCardless), choisir le mode, relancer un paiement refusé. Réservé au gérant de l'établissement.
//
// Corps : { action, restaurant, ... }. Les pages de saisie sont celles de Stripe et de GoCardless :
// ni numéro de carte ni IBAN ne passent par Kivien.

import { base } from '../_partage/base.ts';
import { cors, json, lireEnv, services, SITE } from '../_partage/config.ts';
import { mandatValide } from '../_partage/gocardless.ts';
import { COLONNES, lancerPrelevements, reessayer, type Paiement } from '../_partage/prelevements.ts';

const MODES = ['carte_mission', 'sepa_mission', 'mensuel_carte', 'mensuel_sepa'] as const;
const SEPA: Mode[] = ['sepa_mission', 'mensuel_sepa'];
type Mode = (typeof MODES)[number];

interface Moyen {
  mode: Mode;
  stripe_client: string | null;
  stripe_carte: string | null;
  gocardless_demande: string | null;
  gocardless_mandat: string | null;
  mandat_statut: string | null;
}

class Refus extends Error {
  constructor(message: string, readonly statut = 400) {
    super(message);
  }
}

/** Utilisateur connecté (jeton de session du site) et son droit de gérant sur l'établissement. */
async function gerant(req: Request, restaurant: string): Promise<{ email: string | null }> {
  const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const url = lireEnv('SUPABASE_URL')!;
  const anon = lireEnv('SUPABASE_ANON_KEY')!;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${jeton}` } });
  if (!r.ok) throw new Refus('Session expirée : reconnectez-vous.', 401);
  const utilisateur = (await r.json()) as { email?: string };
  const ok = await base(url, anon, jeton).rpc<boolean>('est_gerant', { p_restaurant: restaurant });
  if (ok !== true) throw new Refus('Réservé au gérant de l’établissement.', 403);
  return { email: utilisateur.email || null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { erreur: 'Méthode non permise.' }, 405);
  try {
    const corps = (await req.json()) as { action?: string; restaurant?: string; session?: string; mode?: string; paiement?: string };
    const restaurant = corps.restaurant ?? '';
    if (!/^[0-9a-f-]{36}$/.test(restaurant)) throw new Refus('Établissement inconnu.');
    const { email } = await gerant(req, restaurant);
    const s = services();
    const [r] = await s.base.lire<{ nom: string }>('restaurants', `select=nom&id=eq.${restaurant}`);
    if (!r) throw new Refus('Établissement inconnu.', 404);
    await s.base.enregistrer('moyens_paiement', { restaurant_id: restaurant }, 'restaurant_id');
    const [m] = await s.base.lire<Moyen>(
      'moyens_paiement',
      `select=mode,stripe_client,stripe_carte,gocardless_demande,gocardless_mandat,mandat_statut&restaurant_id=eq.${restaurant}`,
    );
    const maj = (valeurs: Record<string, unknown>) =>
      s.base.modifier('moyens_paiement', `restaurant_id=eq.${restaurant}`, { ...valeurs, maj_le: new Date().toISOString() });

    switch (corps.action) {
      case 'carte': {
        if (!s.stripe) throw new Refus('Paiement par carte pas encore disponible.', 503);
        let client = m.stripe_client;
        if (!client) {
          client = await s.stripe.creerClient(r.nom, email, restaurant);
          await maj({ stripe_client: client });
        }
        const url = await s.stripe.sessionCarte(client, `${SITE}/paiement?retour=carte&session={CHECKOUT_SESSION_ID}`, `${SITE}/paiement`);
        return json(req, { url });
      }
      case 'carte-confirmer': {
        if (!s.stripe || !m.stripe_client || !corps.session) throw new Refus('Aucune carte en cours d’enregistrement.');
        const carte = await s.stripe.carteDeLaSession(corps.session, m.stripe_client);
        if (!carte) return json(req, { statut: 'attente' });
        await maj({ stripe_carte: carte.carte, carte_libelle: carte.libelle });
        // Missions déjà dues : débitées tout de suite.
        await lancerPrelevements(s, restaurant);
        return json(req, { statut: 'ok', libelle: carte.libelle });
      }
      case 'sepa': {
        if (!s.gocardless) throw new Refus('Prélèvement SEPA pas encore disponible.', 503);
        const { demande, url } = await s.gocardless.demandeMandat({
          restaurantId: restaurant,
          entreprise: r.nom,
          email,
          retour: `${SITE}/paiement?retour=sepa`,
          sortie: `${SITE}/paiement`,
        });
        await maj({ gocardless_demande: demande, gocardless_mandat: null, mandat_statut: null });
        return json(req, { url });
      }
      case 'sepa-confirmer': {
        if (!s.gocardless || !m.gocardless_demande) throw new Refus('Aucun mandat en cours.');
        const mandat = await s.gocardless.mandatDeLaDemande(m.gocardless_demande);
        if (!mandat) return json(req, { statut: 'attente' });
        // Mandat en place : prélèvement au même rythme que le mode actuel (mission ou mois).
        const mode: Mode = m.mode === 'mensuel_carte' || m.mode === 'mensuel_sepa' ? 'mensuel_sepa' : 'sepa_mission';
        await maj({ gocardless_mandat: mandat.mandat, mandat_statut: mandat.statut, sepa_libelle: mandat.libelle, mode });
        if (mode === 'sepa_mission') await lancerPrelevements(s, restaurant);
        return json(req, { statut: 'ok', libelle: mandat.libelle });
      }
      case 'mode': {
        const mode = corps.mode as Mode;
        if (!MODES.includes(mode)) throw new Refus('Mode inconnu.');
        const sepa = SEPA.includes(mode);
        if (!sepa && !m.stripe_carte) throw new Refus('Enregistrez d’abord une carte.');
        if (sepa && !(m.gocardless_mandat && mandatValide(m.mandat_statut))) throw new Refus('Mettez d’abord en place le prélèvement SEPA.');
        await maj({ mode });
        if (mode === 'carte_mission' || mode === 'sepa_mission') await lancerPrelevements(s, restaurant);
        return json(req, { statut: 'ok' });
      }
      case 'reessayer': {
        if (!/^[0-9a-f-]{36}$/.test(corps.paiement ?? '')) throw new Refus('Paiement inconnu.');
        const [p] = await s.base.lire<Paiement>('paiements', `select=${COLONNES}&id=eq.${corps.paiement}&restaurant_id=eq.${restaurant}`);
        if (!p || p.statut !== 'echoue') throw new Refus('Ce paiement ne peut pas être relancé.');
        const resultat = await reessayer(s, p);
        return json(req, { statut: resultat.statut, erreur: resultat.statut === 'echoue' ? resultat.erreur : null });
      }
      default:
        throw new Refus('Action inconnue.');
    }
  } catch (e) {
    if (e instanceof Refus) return json(req, { erreur: e.message }, e.statut);
    console.error('paiement', e instanceof Error ? e.message : e);
    return json(req, { erreur: 'Le service de paiement ne répond pas. Réessayez dans un instant.' }, 502);
  }
});
