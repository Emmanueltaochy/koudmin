/**
 * Identité légale de Kivien, imprimée sur les factures (article L441-9 du Code de commerce) et, côté
 * VPS, en bas des e-mails de prospection (deploy/vps/prospection.sh : même texte).
 * Entrepreneur individuel : « EI » après le nom (obligatoire depuis 2022). TVA à 8,5 % (La Réunion) ;
 * numéro intracommunautaire tiré du SIREN (clé = (12 + 3 × (SIREN mod 97)) mod 97).
 */
export const IDENTITE_KIVIEN = {
  raisonSociale: 'Kivien · Emmanuel TAOCHY EI',
  adresse: "124 route des Canots, 97427 L'Étang-Salé",
  siret: '884 270 604 00025',
  tvaIntracom: 'FR49884270604' as string | null,
  delaiPaiementJours: 30,
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-10 » → « Octobre 2026 » */
export function libelleMois(mois: string): string {
  const [a, m] = mois.split('-');
  const nom = MOIS[Number(m) - 1] ?? '';
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${a}`;
}
