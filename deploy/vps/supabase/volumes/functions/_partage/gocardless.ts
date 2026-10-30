// Appels à l'API GoCardless (sans SDK) : mandat SEPA signé sur la page GoCardless, prélèvements.

import { ErreurPaiement, type ResultatDebit } from './stripe.ts';

export function clientGoCardless(jeton: string, environnement: 'sandbox' | 'live', f: typeof fetch = fetch) {
  const base = environnement === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com';

  async function appel<T>(methode: 'GET' | 'POST', chemin: string, corps?: unknown, idempotence?: string): Promise<T> {
    const r = await f(`${base}/${chemin}`, {
      method: methode,
      headers: {
        Authorization: `Bearer ${jeton}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(idempotence ? { 'Idempotency-Key': idempotence } : {}),
      },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    const json = await r.json();
    if (!r.ok) {
      const e = json?.error ?? {};
      throw new ErreurPaiement(e.message ?? `GoCardless ${r.status}`, e.code);
    }
    return json as T;
  }

  return {
    /** Demande de mandat SEPA et lien vers la page GoCardless où l'établissement saisit son IBAN. */
    async demandeMandat(p: { restaurantId: string; entreprise: string; email: string | null; retour: string; sortie: string }) {
      const { billing_requests: demande } = await appel<{ billing_requests: { id: string } }>('POST', 'billing_requests', {
        billing_requests: {
          mandate_request: { scheme: 'sepa_core', currency: 'EUR' },
          metadata: { restaurant_id: p.restaurantId },
        },
      });
      const { billing_request_flows: flux } = await appel<{ billing_request_flows: { authorisation_url: string } }>(
        'POST',
        'billing_request_flows',
        {
          billing_request_flows: {
            redirect_uri: p.retour,
            exit_uri: p.sortie,
            language: 'fr',
            prefilled_customer: { company_name: p.entreprise, email: p.email ?? undefined },
            links: { billing_request: demande.id },
          },
        },
      );
      return { demande: demande.id, url: flux.authorisation_url };
    },

    /** Mandat obtenu par la demande, avec la fin de l'IBAN ; null tant que la demande n'est pas aboutie. */
    async mandatDeLaDemande(demande: string): Promise<{ mandat: string; statut: string; libelle: string } | null> {
      const { billing_requests: d } = await appel<{
        billing_requests: { status: string; links?: { mandate_request_mandate?: string; customer_bank_account?: string } };
      }>('GET', `billing_requests/${encodeURIComponent(demande)}`);
      const mandat = d.links?.mandate_request_mandate;
      if (d.status !== 'fulfilled' || !mandat) return null;
      const statut = await this.statutMandat(mandat);
      let libelle = 'Prélèvement SEPA';
      if (d.links?.customer_bank_account) {
        const { customer_bank_accounts: c } = await appel<{ customer_bank_accounts: { account_number_ending?: string; bank_name?: string } }>(
          'GET',
          `customer_bank_accounts/${encodeURIComponent(d.links.customer_bank_account)}`,
        );
        libelle = `IBAN •••• ${c.account_number_ending ?? '??'}${c.bank_name ? ` · ${c.bank_name}` : ''}`;
      }
      return { mandat, statut, libelle };
    },

    async statutMandat(mandat: string): Promise<string> {
      const { mandates: m } = await appel<{ mandates: { status: string } }>('GET', `mandates/${encodeURIComponent(mandat)}`);
      return m.status;
    },

    async prelever(p: { mandat: string; montant: number; description: string; idempotence: string; metadata: Record<string, string> }): Promise<ResultatDebit> {
      try {
        const { payments: x } = await appel<{ payments: { id: string; status: string } }>(
          'POST',
          'payments',
          { payments: { amount: p.montant, currency: 'EUR', description: p.description, metadata: p.metadata, links: { mandate: p.mandat } } },
          p.idempotence,
        );
        return statutPrelevement(x.id, x.status);
      } catch (e) {
        return { statut: 'echoue', reference: null, erreur: e instanceof Error ? e.message : 'Prélèvement refusé.' };
      }
    },

    async etatPrelevement(reference: string): Promise<ResultatDebit> {
      const { payments: x } = await appel<{ payments: { id: string; status: string } }>('GET', `payments/${encodeURIComponent(reference)}`);
      return statutPrelevement(x.id, x.status);
    },
  };
}

/** Un prélèvement SEPA met quelques jours : « en cours » jusqu'à confirmation par la banque. */
export function statutPrelevement(id: string, statut: string): ResultatDebit {
  if (statut === 'confirmed' || statut === 'paid_out') return { statut: 'reussi', reference: id };
  if (['failed', 'cancelled', 'charged_back', 'customer_approval_denied'].includes(statut))
    return { statut: 'echoue', reference: id, erreur: statut === 'charged_back' ? 'Prélèvement contesté auprès de la banque.' : 'Prélèvement refusé par la banque.' };
  return { statut: 'en_cours', reference: id };
}

/** Mandat utilisable pour prélever. */
export const mandatValide = (statut: string | null) => !!statut && ['pending_customer_approval', 'pending_submission', 'submitted', 'active'].includes(statut);

export type ClientGoCardless = ReturnType<typeof clientGoCardless>;
