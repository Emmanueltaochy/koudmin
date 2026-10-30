import type { MissionResume, ProfilExtra, ProfilPublic, Secteur } from '@kivien/core';

export interface Profil extends ProfilExtra, ProfilPublic {
  prenom: string;
  nom: string;
  telephone: string;
  commune: string;
}

export interface MissionConfirmee extends MissionResume {
  contratSigne: boolean;
}

export interface ContratExtra {
  affectationId: string;
  employeur: string;
  adresseEmployeur: string;
  siretEmployeur: string | null;
  /** Secteur de l'employeur (texte du contrat). */
  secteur: Secteur;
  signeExtra: boolean;
  signeRestaurant: boolean;
}

/** Infos demandées une seule fois, à la première signature (DPAE). */
export interface InfosContrat {
  dateNaissance: string;
  lieuNaissance: string;
  /** Facultatif. */
  nir: string | null;
  adresse: string;
}

export interface Inscription {
  prenom: string;
  nom: string;
  /** E.164, ex. +262692123456 */
  telephone: string;
  commune: string;
  aVoiture: boolean;
}

export type Creneau = 'midi' | 'soir';
/** « 2026-10-30:soir » */
export type CleDispo = `${string}:${Creneau}`;

export type EtatSession = 'aucune' | 'sansProfil' | 'ok';

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

  mesMissions(): Promise<MissionConfirmee[]>;
  contrat(demandeId: string): Promise<ContratExtra | null>;
  infosContrat(): Promise<InfosContrat | null>;
  enregistrerInfosContrat(i: InfosContrat): Promise<void>;
  /** Signature dessinée (SVG en data URL). */
  signerContrat(affectationId: string, signature: string): Promise<void>;

  dispos(): Promise<CleDispo[]>;
  basculerDispo(jour: string, creneau: Creneau, actif: boolean): Promise<void>;
  majProfil(p: Partial<ProfilExtra & ProfilPublic>): Promise<void>;
  /** Photo de profil en JPEG base64, null sans photo. */
  maPhoto(): Promise<string | null>;
  enregistrerPhoto(jpegBase64: string): Promise<void>;
  supprimerPhoto(): Promise<void>;

  session(): Promise<EtatSession>;
  /** Connexion par mobile et mot de passe. */
  connecter(telephoneE164: string, motDePasse: string): Promise<'ok' | 'identifiants' | 'attente'>;
  /** Crée le compte (mobile et mot de passe) et ouvre la session. */
  creerCompte(telephoneE164: string, motDePasse: string): Promise<'ok' | 'dejaInscrit' | 'attente'>;
  /** Crée le profil, une fois la session ouverte. */
  inscrire(i: Inscription): Promise<void>;
  deconnecter(): Promise<void>;
}

/** Échec réseau : l'écran affiche « Pas de réseau. » et propose de réessayer. */
export class ErreurReseau extends Error {}
