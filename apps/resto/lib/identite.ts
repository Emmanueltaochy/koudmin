/**
 * Identité légale de Koudmin, imprimée sur les factures.
 * À COMPLÉTER avant la mise en production : raison sociale, adresse, SIREN, TVA intracommunautaire.
 * Une facture sans ces mentions n'est pas conforme (article L441-9 du Code de commerce).
 */
export const IDENTITE_KOUDMIN = {
  raisonSociale: 'Koudmin',
  adresse: 'Adresse du siège à compléter, 974 La Réunion',
  siren: null as string | null,
  tvaIntracom: null as string | null,
  delaiPaiementJours: 30,
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-10 » → « Octobre 2026 » */
export function libelleMois(mois: string): string {
  const [a, m] = mois.split('-');
  const nom = MOIS[Number(m) - 1] ?? '';
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${a}`;
}
