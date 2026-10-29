import type {
  JourISO,
  ParametresTarifaires,
  Poste,
  StatutAffectation,
  StatutDemande,
} from '@koudmin/core';
import type { AdresseGeo } from '../adresse';

export interface Restaurant {
  id: string;
  nom: string;
  telephone: string | null;
  /** Adresse habituelle, pour préremplir les demandes. */
  adresse: AdresseGeo | null;
}

export interface NouvelleDemande {
  poste: Poste;
  jour: JourISO;
  debut: number;
  fin: number;
  tauxHoraireBrutCentimes: number;
  adresse: AdresseGeo;
  retourAssure: boolean;
  nbExtras: number;
  consignes: string | null;
}

export interface ExtraAffecte {
  affectationId: string;
  extraId: string;
  prenom: string;
  nom: string;
  telephone: string;
  statut: StatutAffectation;
  confirmeLe: string;
  contratSigneRestaurant: boolean;
  contratSigneExtra: boolean;
  /** Notation après mission, null si pas encore notée. */
  notation: { present: boolean; note: number | null } | null;
  favori: boolean;
}

export interface DemandeSuivi {
  id: string;
  poste: Poste;
  jour: JourISO;
  debut: number;
  fin: number;
  tauxHoraireBrutCentimes: number;
  fraisMiseEnRelationHTCentimes: number;
  adresse: string;
  codePostal: string | null;
  commune: string;
  retourAssure: boolean;
  nbExtras: number;
  consignes: string | null;
  statut: StatutDemande;
  creeLe: string;
  extras: ExtraAffecte[];
}

export interface Favori {
  extraId: string;
  prenom: string;
  nom: string;
  missions: number;
}

export interface Facture {
  /** Mois facturé, « AAAA-MM ». */
  mois: string;
  numero: string;
  /** Mises en relation facturées (extra venu, ou absent mais remplacé). */
  misesEnRelation: number;
  montantHTCentimes: number;
  tauxTVA: number;
}

export interface Notation {
  present: boolean;
  /** 1 à 5, null si absent. */
  note: number | null;
  favori: boolean;
  commentaire: string | null;
}

/** Informations de l'extra pour la DPAE, visibles du seul restaurateur de la mission. */
export interface InfosDPAE {
  prenom: string;
  nom: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  nir: string | null;
  adresse: string | null;
}

/** Accès aux données côté restaurateur. Deux implémentations : fictive (démo) et Supabase. */
export interface SourceResto {
  restaurant(): Promise<Restaurant>;
  parametres(): Promise<ParametresTarifaires>;
  publier(d: NouvelleDemande): Promise<{ id: string }>;
  demandes(): Promise<DemandeSuivi[]>;
  demande(id: string): Promise<DemandeSuivi | null>;
  annulerDemande(id: string): Promise<void>;
  /** Signature du restaurateur (image PNG en data URL). */
  signerContrat(affectationId: string, signature: string): Promise<void>;
  infosDPAE(affectationId: string): Promise<InfosDPAE | null>;
  noter(affectationId: string, n: Notation): Promise<void>;
  favoris(): Promise<Favori[]>;
  retirerFavori(extraId: string): Promise<void>;
  factures(): Promise<Facture[]>;
  /** Prévient à chaque changement d'une demande ou de ses affectations. */
  ecouter(rappel: () => void): () => void;
}

export class ErreurReseau extends Error {}
