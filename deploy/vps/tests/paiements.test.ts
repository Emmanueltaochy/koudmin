// Tests des fonctions de paiement (Deno), sans réseau : Stripe, GoCardless et la base sont simulés.
// Lancement : deno test deploy/vps/tests/

import { deepStrictEqual as egal, ok, rejects } from 'node:assert/strict';
import type { Base } from '../supabase/volumes/functions/_partage/base.ts';
import { clientGoCardless, statutPrelevement } from '../supabase/volumes/functions/_partage/gocardless.ts';
import { lancerPrelevements, reessayer, type Paiement, type Services } from '../supabase/volumes/functions/_partage/prelevements.ts';
import { clientStripe, encoderFormulaire, libelleCarte, type ResultatDebit } from '../supabase/volumes/functions/_partage/stripe.ts';

Deno.test('Stripe : encodage formulaire imbriqué', () => {
  egal(
    encoderFormulaire({ amount: 2062, metadata: { restaurant_id: 'r1' }, expand: ['a.b'], vide: undefined }),
    'amount=2062&metadata%5Brestaurant_id%5D=r1&expand%5B0%5D=a.b',
  );
});

Deno.test('Stripe : libellé de carte', () => {
  egal(libelleCarte({ brand: 'visa', last4: '4242', exp_month: 3, exp_year: 2028 }), 'Visa •••• 4242 · 03/28');
});

Deno.test('Stripe : débit hors session, clé d’idempotence et carte refusée', async () => {
  const appels: { url: string; init: RequestInit }[] = [];
  const faux = (async (url: string, init: RequestInit) => {
    appels.push({ url, init });
    if (String(init.body).includes('pm_refusee'))
      return Response.json({ error: { type: 'card_error', message: 'Votre carte a été refusée.', payment_intent: { id: 'pi_2', status: 'requires_payment_method', last_payment_error: { message: 'Votre carte a été refusée.' } } } }, { status: 402 });
    return Response.json({ id: 'pi_1', status: 'succeeded' });
  }) as typeof fetch;
  const s = clientStripe('sk_test_x', faux);
  const ok1 = await s.debiter({ client: 'cus_1', carte: 'pm_1', montant: 2062, description: 'Kivien', idempotence: 'cle-1', metadata: {} });
  egal(ok1, { statut: 'reussi', reference: 'pi_1' });
  const entetes = appels[0].init.headers as Record<string, string>;
  egal(entetes['Idempotency-Key'], 'cle-1');
  ok(String(appels[0].init.body).includes('off_session=true'));
  ok(String(appels[0].init.body).includes('confirm=true'));
  const refus = await s.debiter({ client: 'cus_1', carte: 'pm_refusee', montant: 2062, description: 'Kivien', idempotence: 'cle-2', metadata: {} });
  egal(refus, { statut: 'echoue', reference: 'pi_2', erreur: 'Votre carte a été refusée.' });
});

Deno.test('Stripe : une session d’un autre client est refusée', async () => {
  const faux = (async () => Response.json({ customer: 'cus_autre', status: 'complete', setup_intent: null })) as unknown as typeof fetch;
  await rejects(clientStripe('sk', faux).carteDeLaSession('cs_1', 'cus_1'), /inconnue/);
});

Deno.test('GoCardless : statuts de prélèvement', () => {
  egal(statutPrelevement('PM1', 'confirmed').statut, 'reussi');
  egal(statutPrelevement('PM1', 'submitted').statut, 'en_cours');
  egal(statutPrelevement('PM1', 'failed').statut, 'echoue');
  egal(statutPrelevement('PM1', 'charged_back').statut, 'echoue');
});

Deno.test('GoCardless : environnement sandbox par défaut et en-tête de version', async () => {
  let url = '';
  let entetes: Record<string, string> = {};
  const faux = (async (u: string, init: RequestInit) => {
    url = u;
    entetes = init.headers as Record<string, string>;
    return Response.json({ payments: { id: 'PM1', status: 'pending_submission' } });
  }) as typeof fetch;
  const r = await clientGoCardless('jeton', 'sandbox', faux).prelever({ mandat: 'MD1', montant: 4124, description: 'x', idempotence: 'k', metadata: {} });
  egal(r.statut, 'en_cours');
  ok(url.startsWith('https://api-sandbox.gocardless.com/payments'));
  egal(entetes['GoCardless-Version'], '2015-07-06');
  egal(entetes['Idempotency-Key'], 'k');
});

// ---------------------------------------------------------------------------
// Logique des prélèvements, sur une fausse base en mémoire.

function fausseBase(donnees: { aLancer?: unknown[]; mois?: unknown[]; moyens?: Record<string, unknown>[] }) {
  const paiements: (Paiement & Record<string, unknown>)[] = [];
  let n = 0;
  const filtrer = (lignes: Record<string, unknown>[], requete: string) =>
    lignes.filter((l) =>
      requete.split('&').every((c) => {
        const [col, cond] = c.split('=');
        if (col === 'select' || !cond) return true;
        if (cond === 'is.null') return l[col] == null;
        if (cond === 'not.is.null') return l[col] != null;
        if (cond.startsWith('eq.')) return String(l[col]) === cond.slice(3);
        if (cond.startsWith('lt.')) return String(l[col]) < cond.slice(3);
        return true;
      }),
    );
  const b: Base = {
    rpc: async <T>(nom: string) => (nom === 'paiements_a_lancer' ? donnees.aLancer ?? [] : donnees.mois ?? []) as T,
    lire: async <T>(table: string, requete: string) =>
      filtrer(table === 'paiements' ? paiements : donnees.moyens ?? [], requete) as T[],
    inserer: async <T>(_t: string, ligne: Record<string, unknown>) => {
      if (ligne.affectation_id && paiements.some((p) => p.affectation_id === ligne.affectation_id)) return null;
      const p = { id: `p${++n}`, statut: 'en_cours', tentatives: 1, reference: null, mois: null, affectation_id: null, maj_le: new Date().toISOString(), ...ligne } as unknown as Paiement & Record<string, unknown>;
      paiements.push(p);
      return p as T;
    },
    enregistrer: async () => {},
    modifier: async (_t: string, requete: string, valeurs: Record<string, unknown>) => {
      for (const p of filtrer(paiements, requete)) Object.assign(p, valeurs);
    },
    supprimer: async () => {},
  };
  return { b, paiements };
}

function fauxStripe(resultat: (cle: string) => ResultatDebit) {
  const cles: string[] = [];
  return {
    cles,
    client: {
      creerClient: async () => 'cus',
      sessionCarte: async () => 'https://checkout',
      carteDeLaSession: async () => null,
      debiter: async (p: { idempotence: string }) => {
        cles.push(p.idempotence);
        return resultat(p.idempotence);
      },
      etatDebit: async (ref: string) => ({ statut: 'reussi', reference: ref }) as ResultatDebit,
    },
  };
}

const MOYEN = { restaurant_id: 'r1', stripe_client: 'cus_1', stripe_carte: 'pm_1', gocardless_mandat: null, mandat_statut: null, gocardless_demande: null };
const MISSION = { affectation_id: 'a1', restaurant_id: 'r1', libelle: 'Kivien · mission', montant_ht_centimes: 1900, tva_centimes: 162 };

Deno.test('Prélèvements : une mission débitée une seule fois, TTC 20,62 €', async () => {
  const { b, paiements } = fausseBase({ aLancer: [MISSION], moyens: [MOYEN] });
  const st = fauxStripe((cle) => ({ statut: 'reussi', reference: `pi_${cle}` }));
  const s: Services = { base: b, stripe: st.client as unknown as Services['stripe'], gocardless: null };
  const bilan = await lancerPrelevements(s);
  egal(bilan.reussis, 1);
  egal(paiements[0].montant_ttc_centimes, 2062);
  egal(paiements[0].statut, 'reussi');
  // Second passage : la fausse base renvoie encore la mission, l'unicité empêche un second débit.
  await lancerPrelevements(s);
  egal(st.cles.length, 1);
});

Deno.test('Prélèvements : refus puis nouvelle tentative avec une nouvelle clé', async () => {
  const { b, paiements } = fausseBase({ aLancer: [MISSION], moyens: [MOYEN] });
  let refuser = true;
  const st = fauxStripe(() => (refuser ? { statut: 'echoue', reference: 'pi_x', erreur: 'Refusée' } : { statut: 'reussi', reference: 'pi_y' }));
  const s: Services = { base: b, stripe: st.client as unknown as Services['stripe'], gocardless: null };
  await lancerPrelevements(s);
  egal(paiements[0].statut, 'echoue');
  egal(paiements[0].erreur, 'Refusée');
  refuser = false;
  const r = await reessayer(s, paiements[0]);
  egal(r.statut, 'reussi');
  egal(paiements[0].tentatives, 2);
  egal(st.cles, ['kivien-p1-1', 'kivien-p1-2']);
});

Deno.test('Prélèvements : débit interrompu renvoyé avec la même clé', async () => {
  const { b, paiements } = fausseBase({ moyens: [MOYEN] });
  await b.inserer('paiements', { restaurant_id: 'r1', type: 'mission', affectation_id: 'a9', moyen: 'carte', libelle: 'x', montant_ttc_centimes: 2062 });
  paiements[0].maj_le = new Date(Date.now() - 3600e3).toISOString();
  const st = fauxStripe(() => ({ statut: 'reussi', reference: 'pi_9' }));
  await lancerPrelevements({ base: b, stripe: st.client as unknown as Services['stripe'], gocardless: null });
  egal(st.cles, ['kivien-p1-1']);
  egal(paiements[0].statut, 'reussi');
});

Deno.test('Prélèvements : facture mensuelle SEPA seulement avec un mandat valide', async () => {
  const mois = { restaurant_id: 'r1', mois: '2026-10', mode: 'mensuel_sepa', libelle: 'Kivien · facture 2026-10', mises_en_relation: 2, montant_ht_centimes: 3800, tva_centimes: 323 };
  const prelevements: string[] = [];
  const gc = {
    mandatDeLaDemande: async () => null,
    statutMandat: async () => 'active',
    prelever: async (p: { idempotence: string; montant: number }) => {
      prelevements.push(`${p.idempotence}:${p.montant}`);
      return { statut: 'en_cours', reference: 'PM1' } as ResultatDebit;
    },
    etatPrelevement: async () => ({ statut: 'en_cours', reference: 'PM1' }) as ResultatDebit,
  } as unknown as Services['gocardless'];
  const sansMandat = fausseBase({ mois: [mois], moyens: [{ ...MOYEN, gocardless_mandat: null }] });
  await lancerPrelevements({ base: sansMandat.b, stripe: null, gocardless: gc });
  egal(sansMandat.paiements.length, 0);
  const avecMandat = fausseBase({ mois: [mois], moyens: [{ ...MOYEN, gocardless_mandat: 'MD1', mandat_statut: 'active' }] });
  await lancerPrelevements({ base: avecMandat.b, stripe: null, gocardless: gc });
  egal(prelevements, ['kivien-p1-1:4123']);
  egal(avecMandat.paiements[0].statut, 'en_cours');
  egal(avecMandat.paiements[0].moyen, 'sepa');
});
