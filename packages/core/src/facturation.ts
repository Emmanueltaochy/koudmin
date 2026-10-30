import type { StatutAffectation } from './domaine';

/**
 * Règle de facturation : frais HT par mise en relation (paramètre, 19 € en 2026), non facturée si l'extra
 * est absent et non remplacé. Un désistement n'est pas facturé ; son remplaçant l'est.
 */
export function miseEnRelationFacturee(statut: StatutAffectation): boolean {
  return statut === 'confirmee' || statut === 'terminee';
}

/** TVA arrondie au centime (demi vers le haut). */
export function tvaCentimes(htCentimes: number, tvaPourMille: number): number {
  return Math.floor((2 * htCentimes * tvaPourMille + 1000) / 2000);
}

export interface TotauxFacture {
  htCentimes: number;
  tvaCentimes: number;
  ttcCentimes: number;
}

export function totauxFacture(nbMisesEnRelation: number, fraisHTCentimes: number, tvaPourMille: number): TotauxFacture {
  const ht = nbMisesEnRelation * fraisHTCentimes;
  const tva = tvaCentimes(ht, tvaPourMille);
  return { htCentimes: ht, tvaCentimes: tva, ttcCentimes: ht + tva };
}
