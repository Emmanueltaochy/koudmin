import { bornesMission } from '@kivien/core';
import type { DemandeSuivi, ExtraAffecte } from './donnees';

/** Étape d'une demande, pour l'affichage. Le temps fait passer « en cours » à « à noter ». */
export type Phase = 'recherche' | 'pourvue' | 'enCours' | 'aNoter' | 'terminee' | 'annulee';

export const extrasActifs = (d: DemandeSuivi): ExtraAffecte[] =>
  d.extras.filter((e) => e.statut !== 'desistee');

export function phaseDemande(d: DemandeSuivi, maintenant = Date.now()): Phase {
  if (d.statut === 'annulee') return 'annulee';
  const b = bornesMission(d.jour, d.debut, d.fin);
  const actifs = extrasActifs(d);
  if (maintenant >= b.debut) {
    if (actifs.length === 0) return 'terminee';
    if (maintenant < b.fin) return 'enCours';
    return actifs.some((e) => !e.notation) ? 'aNoter' : 'terminee';
  }
  return actifs.length >= d.nbExtras ? 'pourvue' : 'recherche';
}

export const aVenir = (d: DemandeSuivi) => ['recherche', 'pourvue', 'enCours'].includes(phaseDemande(d));
