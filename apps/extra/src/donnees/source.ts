import type { MissionResume, ProfilExtra } from '@koudmin/core';

export interface Profil extends ProfilExtra {
  prenom: string;
  commune: string;
}

/** Lieu exact : renvoyé seulement une fois la mission confirmée par l'extra. */
export interface LieuMission {
  adresse: string;
  codePostal: string | null;
  acces: string | null;
  telephone: string | null;
  lat: number;
  lng: number;
}

export interface MissionDetail extends MissionResume {
  tenue: string | null;
  /** Confirmée par l'extra connecté. */
  confirmee: boolean;
  /** Encore ouverte : ni pourvue, ni commencée. */
  disponible: boolean;
  lieu: LieuMission | null;
}

export type ReponseAcceptation = 'confirmee' | 'deja_prise' | 'expiree';

/** Accès aux données côté extra. Deux implémentations : fictive (démo) et Supabase. */
export interface SourceDonnees {
  profil(): Promise<Profil>;
  missions(): Promise<MissionResume[]>;
  /** null si la mission n'existe pas ou n'est plus visible. */
  detail(id: string): Promise<MissionDetail | null>;
  /** « Mi lé la ». Le serveur départage les extras qui acceptent en même temps. */
  accepter(id: string): Promise<ReponseAcceptation>;
  seDesister(id: string): Promise<void>;
  /** Prévient quand une mission change (publiée, prise, libérée). Renvoie la fonction de désabonnement. */
  ecouterMissions(rappel: () => void): () => void;
}

/** Échec réseau : l'écran affiche « Pas de réseau. » et propose de réessayer. */
export class ErreurReseau extends Error {}
