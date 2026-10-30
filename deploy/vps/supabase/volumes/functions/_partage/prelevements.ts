// Débits des frais Kivien : lancés toutes les heures (et après l'enregistrement d'un moyen de paiement).
//   1. Mandats SEPA en attente : relus jusqu'à obtention.
//   2. Missions finies depuis 24 h, mode « carte à chaque mission » : un débit par extra venu.
//   3. Mois terminés, modes mensuels : un débit (carte) ou un prélèvement (SEPA) par mois.
//   4. Débits interrompus (coupure entre l'inscription et l'envoi) : renvoyés avec la même clé.
//   5. Débits en cours (SEPA, carte en traitement) : statut relu chez Stripe ou GoCardless.
// Chaque débit est d'abord inscrit dans `paiements` (unique par mission ou par mois), puis envoyé
// avec la clé d'idempotence « paiement + tentative » : relancer la fonction ne débite jamais deux fois.

import type { Base } from './base.ts';
import { mandatValide, type ClientGoCardless } from './gocardless.ts';
import type { ClientStripe, ResultatDebit } from './stripe.ts';

export interface Services {
  base: Base;
  stripe: ClientStripe | null;
  gocardless: ClientGoCardless | null;
}

export interface Paiement {
  id: string;
  restaurant_id: string;
  type: 'mission' | 'mensuel';
  affectation_id: string | null;
  mois: string | null;
  moyen: 'carte' | 'sepa';
  libelle: string;
  montant_ttc_centimes: number;
  statut: 'en_cours' | 'reussi' | 'echoue';
  tentatives: number;
  reference: string | null;
}

interface Moyen {
  stripe_client: string | null;
  stripe_carte: string | null;
  gocardless_mandat: string | null;
  mandat_statut: string | null;
}

interface AFacturer {
  restaurant_id: string;
  libelle: string;
  montant_ht_centimes: number;
  tva_centimes: number;
}
interface MissionADebiter extends AFacturer {
  affectation_id: string;
}
interface MoisAFacturer extends AFacturer {
  mois: string;
  mode: 'mensuel_carte' | 'mensuel_sepa';
  mises_en_relation: number;
}

export interface Bilan {
  lances: number;
  reussis: number;
  echoues: number;
  enCours: number;
  mandats: number;
}

const nouveauBilan = (): Bilan => ({ lances: 0, reussis: 0, echoues: 0, enCours: 0, mandats: 0 });
const COLONNES = 'id,restaurant_id,type,affectation_id,mois,moyen,libelle,montant_ttc_centimes,statut,tentatives,reference';

async function noter(s: Services, id: string, r: ResultatDebit, bilan: Bilan) {
  await s.base.modifier('paiements', `id=eq.${id}`, {
    statut: r.statut,
    reference: r.reference,
    erreur: r.statut === 'echoue' ? r.erreur : null,
    maj_le: new Date().toISOString(),
  });
  if (r.statut === 'reussi') bilan.reussis++;
  else if (r.statut === 'echoue') bilan.echoues++;
  else bilan.enCours++;
}

/** Envoie un débit inscrit (statut en cours, sans référence) au prestataire de son moyen. */
export async function envoyer(s: Services, p: Paiement, bilan: Bilan = nouveauBilan()): Promise<ResultatDebit> {
  const [m] = await s.base.lire<Moyen>('moyens_paiement', `select=stripe_client,stripe_carte,gocardless_mandat,mandat_statut&restaurant_id=eq.${p.restaurant_id}`);
  const idempotence = `kivien-${p.id}-${p.tentatives}`;
  const metadata: Record<string, string> = { restaurant_id: p.restaurant_id, paiement_id: p.id };
  if (p.affectation_id) metadata.affectation_id = p.affectation_id;
  if (p.mois) metadata.mois = p.mois;
  let r: ResultatDebit;
  if (p.moyen === 'sepa') {
    r = s.gocardless && m?.gocardless_mandat && mandatValide(m.mandat_statut)
      ? await s.gocardless.prelever({ mandat: m.gocardless_mandat, montant: p.montant_ttc_centimes, description: p.libelle, idempotence, metadata })
      : { statut: 'echoue', reference: null, erreur: 'Aucun mandat de prélèvement valide.' };
  } else {
    r = s.stripe && m?.stripe_client && m.stripe_carte
      ? await s.stripe.debiter({ client: m.stripe_client, carte: m.stripe_carte, montant: p.montant_ttc_centimes, description: p.libelle, idempotence, metadata })
      : { statut: 'echoue', reference: null, erreur: 'Aucune carte enregistrée.' };
  }
  bilan.lances++;
  await noter(s, p.id, r, bilan);
  return r;
}

export async function lancerPrelevements(s: Services, restaurant?: string): Promise<Bilan> {
  const bilan = nouveauBilan();
  const filtre = restaurant ? { p_restaurant: restaurant } : {};
  const duRestaurant = restaurant ? `&restaurant_id=eq.${restaurant}` : '';

  // 1. Mandats en attente : un mandat obtenu sert dès ce passage.
  if (s.gocardless) {
    const attente = await s.base.lire<{ restaurant_id: string; gocardless_demande: string }>(
      'moyens_paiement',
      `select=restaurant_id,gocardless_demande&gocardless_demande=not.is.null&gocardless_mandat=is.null${duRestaurant}`,
    );
    for (const m of attente) {
      const mandat = await s.gocardless.mandatDeLaDemande(m.gocardless_demande).catch(() => null);
      if (!mandat) continue;
      await s.base.modifier('moyens_paiement', `restaurant_id=eq.${m.restaurant_id}`, {
        gocardless_mandat: mandat.mandat,
        mandat_statut: mandat.statut,
        sepa_libelle: mandat.libelle,
        maj_le: new Date().toISOString(),
      });
      bilan.mandats++;
    }
  }

  // 2. Une mission, un débit.
  if (s.stripe) {
    for (const m of await s.base.rpc<MissionADebiter[]>('paiements_a_lancer', filtre)) {
      const p = await s.base.inserer<Paiement>('paiements', {
        restaurant_id: m.restaurant_id,
        type: 'mission',
        affectation_id: m.affectation_id,
        moyen: 'carte',
        libelle: m.libelle,
        mises_en_relation: 1,
        montant_ht_centimes: m.montant_ht_centimes,
        tva_centimes: m.tva_centimes,
        montant_ttc_centimes: m.montant_ht_centimes + m.tva_centimes,
      });
      if (p) await envoyer(s, p, bilan); // null : déjà pris par un autre passage
    }
  }

  // 3. Un mois, un débit (seulement si le moyen choisi est en place).
  for (const f of await s.base.rpc<MoisAFacturer[]>('mois_a_facturer', filtre)) {
    const sepa = f.mode === 'mensuel_sepa';
    if (!(sepa ? s.gocardless : s.stripe)) continue;
    const [m] = await s.base.lire<Moyen>('moyens_paiement', `select=stripe_client,stripe_carte,gocardless_mandat,mandat_statut&restaurant_id=eq.${f.restaurant_id}`);
    if (sepa ? !m?.gocardless_mandat || !mandatValide(m.mandat_statut) : !m?.stripe_carte) continue;
    const p = await s.base.inserer<Paiement>('paiements', {
      restaurant_id: f.restaurant_id,
      type: 'mensuel',
      mois: f.mois,
      moyen: sepa ? 'sepa' : 'carte',
      libelle: f.libelle,
      mises_en_relation: f.mises_en_relation,
      montant_ht_centimes: f.montant_ht_centimes,
      tva_centimes: f.tva_centimes,
      montant_ttc_centimes: f.montant_ht_centimes + f.tva_centimes,
    });
    if (p) await envoyer(s, p, bilan);
  }

  // 4. Interrompus depuis plus de 10 min : même tentative, donc même clé, jamais de double débit.
  const avant = new Date(Date.now() - 10 * 60e3).toISOString();
  for (const p of await s.base.lire<Paiement>('paiements', `select=${COLONNES}&statut=eq.en_cours&reference=is.null&maj_le=lt.${avant}${duRestaurant}`)) {
    await envoyer(s, p, bilan);
  }

  // 5. En cours chez le prestataire : statut relu.
  for (const p of await s.base.lire<Paiement>('paiements', `select=${COLONNES}&statut=eq.en_cours&reference=not.is.null${duRestaurant}`)) {
    const r = p.moyen === 'sepa'
      ? s.gocardless && (await s.gocardless.etatPrelevement(p.reference!))
      : s.stripe && (await s.stripe.etatDebit(p.reference!));
    if (r && r.statut !== 'en_cours') await noter(s, p.id, r, bilan);
  }
  return bilan;
}

/** Nouvelle tentative d'un débit refusé (après changement de carte, par exemple). */
export async function reessayer(s: Services, p: Paiement): Promise<ResultatDebit> {
  if (p.statut !== 'echoue') throw new Error('Seul un paiement refusé peut être relancé.');
  const suivant = { ...p, statut: 'en_cours' as const, tentatives: p.tentatives + 1, reference: null };
  await s.base.modifier('paiements', `id=eq.${p.id}&statut=eq.echoue`, {
    statut: 'en_cours',
    tentatives: suivant.tentatives,
    reference: null,
    erreur: null,
    maj_le: new Date().toISOString(),
  });
  return envoyer(s, suivant);
}

export { COLONNES };
