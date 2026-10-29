import type { JourISO } from './dates';
import type { Poste } from './postes';
import type { MinuteDuJour } from './temps';

/**
 * Modèle partagé par l'app extra et le site restaurateur. Les deux lisent et écrivent
 * la même base Supabase ; ces types (et les statuts ci-dessous) sont la référence commune.
 */

export type StatutDemande = 'publiee' | 'pourvue' | 'annulee' | 'terminee';
/** Une affectation = un extra sur une demande. */
export type StatutAffectation = 'confirmee' | 'desistee' | 'absente' | 'terminee';

export interface Demande {
  id: string;
  restaurantId: string;
  poste: Poste;
  jour: JourISO;
  debut: MinuteDuJour;
  fin: MinuteDuJour;
  /** Figé à la publication depuis `parametres`. */
  tauxHoraireBrutCentimes: number;
  fraisMiseEnRelationHTCentimes: number;
  adresse: string;
  retourAssure: boolean;
  nbExtras: number;
  consignes: string | null;
  statut: StatutDemande;
}
