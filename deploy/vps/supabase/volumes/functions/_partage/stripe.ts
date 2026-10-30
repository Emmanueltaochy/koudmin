// Appels à l'API Stripe (sans SDK) : client, enregistrement de carte par Stripe Checkout, débit.
// Les numéros de carte ne passent jamais par Kivien : la saisie se fait sur la page Stripe.

export class ErreurPaiement extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

type Valeur = string | number | boolean | undefined | null | Valeur[] | { [cle: string]: Valeur };

/** Encodage « formulaire » de Stripe : metadata[cle]=valeur, expand[0]=… */
export function encoderFormulaire(params: Record<string, Valeur>): string {
  const paires: string[] = [];
  const ajouter = (cle: string, v: Valeur) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x, i) => ajouter(`${cle}[${i}]`, x));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) ajouter(`${cle}[${k}]`, x);
    else paires.push(`${encodeURIComponent(cle)}=${encodeURIComponent(String(v))}`);
  };
  for (const [k, v] of Object.entries(params)) ajouter(k, v);
  return paires.join('&');
}

export interface CarteEnregistree {
  carte: string;
  libelle: string;
}

export type ResultatDebit = { statut: 'reussi' | 'en_cours'; reference: string } | { statut: 'echoue'; reference: string | null; erreur: string };

const MARQUES: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', cb: 'CB' };

export function libelleCarte(c: { brand?: string; last4?: string; exp_month?: number; exp_year?: number }): string {
  const marque = MARQUES[c.brand ?? ''] ?? 'Carte';
  const exp = c.exp_month && c.exp_year ? ` · ${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '';
  return `${marque} •••• ${c.last4 ?? '????'}${exp}`;
}

/** Statut Stripe d'un PaymentIntent → statut Kivien. */
export function statutDebit(pi: { id: string; status: string; last_payment_error?: { message?: string } | null }): ResultatDebit {
  if (pi.status === 'succeeded') return { statut: 'reussi', reference: pi.id };
  if (pi.status === 'processing') return { statut: 'en_cours', reference: pi.id };
  if (pi.status === 'requires_action')
    return { statut: 'echoue', reference: pi.id, erreur: 'La banque demande une confirmation : réessayez depuis la page Paiement.' };
  return { statut: 'echoue', reference: pi.id, erreur: pi.last_payment_error?.message ?? 'Paiement refusé par la banque.' };
}

export function clientStripe(cle: string, f: typeof fetch = fetch) {
  async function appel<T>(methode: 'GET' | 'POST', chemin: string, params: Record<string, Valeur> = {}, idempotence?: string): Promise<T> {
    const corps = encoderFormulaire(params);
    const url = `https://api.stripe.com/v1/${chemin}${methode === 'GET' && corps ? `?${corps}` : ''}`;
    const r = await f(url, {
      method: methode,
      headers: {
        Authorization: `Bearer ${cle}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
        ...(idempotence ? { 'Idempotency-Key': idempotence } : {}),
      },
      body: methode === 'POST' ? corps : undefined,
    });
    const json = await r.json();
    if (!r.ok) {
      const e = json?.error ?? {};
      // Carte refusée : Stripe renvoie aussi le PaymentIntent, gardé pour la trace.
      if (e.type === 'card_error' && e.payment_intent) return e.payment_intent as T;
      throw new ErreurPaiement(e.message ?? `Stripe ${r.status}`, e.code);
    }
    return json as T;
  }

  return {
    async creerClient(nom: string, email: string | null, restaurantId: string): Promise<string> {
      const c = await appel<{ id: string }>('POST', 'customers', { name: nom, email: email ?? undefined, metadata: { restaurant_id: restaurantId } });
      return c.id;
    },

    /** Page Stripe d'enregistrement de carte (aucun débit). */
    async sessionCarte(client: string, succes: string, annulation: string): Promise<string> {
      const s = await appel<{ url: string }>('POST', 'checkout/sessions', {
        mode: 'setup',
        customer: client,
        currency: 'eur',
        payment_method_types: ['card'],
        locale: 'fr',
        success_url: succes,
        cancel_url: annulation,
      });
      return s.url;
    },

    /** Carte enregistrée au retour de la page Stripe ; null si la session n'est pas terminée. */
    async carteDeLaSession(session: string, client: string): Promise<CarteEnregistree | null> {
      const s = await appel<{
        customer: string;
        status: string;
        setup_intent: { status: string; payment_method: { id: string; card?: Parameters<typeof libelleCarte>[0] } } | null;
      }>('GET', `checkout/sessions/${encodeURIComponent(session)}`, { expand: ['setup_intent.payment_method'] });
      if (s.customer !== client) throw new ErreurPaiement('Session de paiement inconnue.');
      if (s.status !== 'complete' || s.setup_intent?.status !== 'succeeded') return null;
      const pm = s.setup_intent.payment_method;
      await appel('POST', `customers/${client}`, { invoice_settings: { default_payment_method: pm.id } });
      return { carte: pm.id, libelle: libelleCarte(pm.card ?? {}) };
    },

    /** Débit hors session sur la carte enregistrée. Une même clé d'idempotence ne débite qu'une fois. */
    async debiter(p: { client: string; carte: string; montant: number; description: string; idempotence: string; metadata: Record<string, string> }): Promise<ResultatDebit> {
      try {
        const pi = await appel<{ id: string; status: string; last_payment_error?: { message?: string } }>(
          'POST',
          'payment_intents',
          {
            amount: p.montant,
            currency: 'eur',
            customer: p.client,
            payment_method: p.carte,
            off_session: true,
            confirm: true,
            description: p.description,
            statement_descriptor_suffix: 'KIVIEN',
            metadata: p.metadata,
          },
          p.idempotence,
        );
        return statutDebit(pi);
      } catch (e) {
        return { statut: 'echoue', reference: null, erreur: e instanceof Error ? e.message : 'Paiement refusé.' };
      }
    },

    async etatDebit(reference: string): Promise<ResultatDebit> {
      return statutDebit(await appel('GET', `payment_intents/${encodeURIComponent(reference)}`));
    },
  };
}

export type ClientStripe = ReturnType<typeof clientStripe>;
