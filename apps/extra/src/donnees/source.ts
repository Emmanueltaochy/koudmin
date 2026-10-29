import type { MissionResume, ProfilExtra } from '@koudmin/core';

export interface Profil extends ProfilExtra {
  prenom: string;
  commune: string;
}

/** Accès aux données côté extra. Deux implémentations : fictive (démo) et Supabase. */
export interface SourceDonnees {
  profil(): Promise<Profil>;
  missions(): Promise<MissionResume[]>;
  /** Prévient quand une mission change (publiée, prise, libérée). Renvoie la fonction de désabonnement. */
  ecouterMissions(rappel: () => void): () => void;
}

/** Échec réseau : l'écran passe en « Pas de réseau. ». */
export class ErreurReseau extends Error {}
