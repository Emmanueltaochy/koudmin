/**
 * Formules d'une demande. « declaration » : mise en relation, l'établissement embauche l'extra et
 * paie les frais Kivien à l'heure (seule formule ouverte). « tout_compris » : facture unique,
 * l'extra est embauché par une agence de travail temporaire partenaire. Préparée, fermée par défaut
 * (table reglages_formules).
 */
import { formatEuros } from './montants';
import { formatDuree } from './temps';

export type Formule = 'declaration' | 'tout_compris';
export const FORMULES: readonly Formule[] = ['declaration', 'tout_compris'];

/** Ce que le formulaire de demande peut proposer (fonction formules_proposees). */
export interface FormulesProposees {
  toutCompris: boolean;
  /** Prix facturé = salaire brut × coefficient, en millièmes (2000 = × 2). */
  coefficientMilliemes: number;
}

/**
 * Prix HT d'un extra en formule tout compris : durée × taux horaire brut × coefficient, arrondi au
 * centime (même calcul que la base, fonction prix_tout_compris_centimes). Entiers seulement.
 */
export function prixToutComprisCentimes(
  tauxHoraireBrutCentimes: number,
  minutes: number,
  coefficientMilliemes: number,
): number {
  for (const [nom, v] of Object.entries({ tauxHoraireBrutCentimes, minutes, coefficientMilliemes }))
    if (!Number.isSafeInteger(v) || v < 0) throw new Error(`${nom} doit être un entier positif`);
  return Math.floor(
    (2 * minutes * tauxHoraireBrutCentimes * coefficientMilliemes + 60000) / 120000,
  );
}

/** « × 2 », « × 1,95 ». */
export function formatCoefficient(milliemes: number): string {
  return `× ${(milliemes / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}`;
}

/** Coefficient saisi « 2 », « 1,95 », « 1.95 » rendu en millièmes ; null si illisible ou hors limites. */
export function lireCoefficient(saisie: string): number | null {
  const t = saisie.trim().replace(',', '.');
  if (!/^[0-9](\.[0-9]{1,3})?$/.test(t)) return null;
  const m = Math.round(Number(t) * 1000);
  return m >= 1000 && m <= 4000 ? m : null;
}

export const textesFormules = {
  /** Formulaire de demande (visible seulement quand la formule tout compris est ouverte). */
  demande: {
    titre: 'Formule',
    declaration: "J'embauche l'extra",
    declarationAide: (frais: string) =>
      `Vous signez le contrat et versez le salaire. Frais Kivien : ${frais} HT par heure d'extra.`,
    toutCompris: 'Kivien s’occupe de tout',
    toutComprisAide:
      "Une seule facture. L'extra est embauché par notre agence de travail temporaire partenaire : contrat, DPAE, salaire et bulletin de paie compris.",
    prix: 'Facture unique',
    legendePrix: (
      nbExtras: number,
      minutes: number,
      tauxCentimes: number,
      coefficientMilliemes: number,
    ) =>
      `${nbExtras} × ${formatDuree(minutes)} × ${formatEuros(tauxCentimes)} ${formatCoefficient(coefficientMilliemes)}. Salaire, charges et formalités compris.`,
  },
  admin: {
    titre: 'Formule tout compris',
    aide: "Facture unique pour l'établissement, l'extra étant embauché par une agence de travail temporaire partenaire. À ouvrir seulement quand l'accord avec l'agence est signé et que la suite du parcours (contrat de mission, facturation) est en place.",
    ouvrir: 'Proposer la formule tout compris',
    fermee: 'Fermée : toutes les demandes sont en mise en relation.',
    ouverte: 'Ouverte : le formulaire de demande propose les deux formules.',
    coefficient: 'Coefficient appliqué au salaire brut',
    coefficientAide: 'Entre 1 et 4. Exemple : 2 pour facturer deux fois le salaire brut.',
    demandes: (n: number) => `${n} demande${n > 1 ? 's' : ''} en formule tout compris`,
    enregistrer: 'Enregistrer la formule',
    enregistre: 'Formule enregistrée.',
    erreur: 'Formule non enregistrée. Vérifiez le coefficient, puis réessayez.',
  },
} as const;
