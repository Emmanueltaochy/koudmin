import type {
  JourISO,
  ParametresTarifaires,
  Poste,
  ProfilPublic,
  Secteur,
  StatutAffectation,
  StatutDemande,
} from '@kivien/core';
import type { AdresseGeo } from '../adresse';

/** « gerant » : accès complet (établissements, utilisateurs, factures). « equipe » : missions. */
export type Role = 'gerant' | 'equipe';

/** Un établissement auquel l'utilisateur a accès. */
export interface Restaurant {
  id: string;
  nom: string;
  telephone: string | null;
  siret: string | null;
  secteur: Secteur;
  role: Role;
  /** Adresse habituelle, pour préremplir les demandes. */
  adresse: AdresseGeo | null;
}

export interface NouvelEtablissement {
  nom: string;
  siret: string;
  secteur: Secteur;
  adresse: AdresseGeo;
}

export type ResultatEtablissement = 'ok' | 'siret' | 'siretInvalide' | 'adresse' | 'extra';

/** Personne ayant accès à un établissement, ou invitation en attente (utilisateurId null). */
export interface Membre {
  utilisateurId: string | null;
  telephone: string;
  role: Role;
  enAttente: boolean;
  moi: boolean;
}

export type ResultatInvitation = 'ok' | 'dejaMembre' | 'compteExtra' | 'reserve';

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

/** Extra sur une demande, avec son profil public (compétences, expérience, langues, présentation). */
export interface ExtraAffecte extends ProfilPublic {
  affectationId: string;
  extraId: string;
  prenom: string;
  nom: string;
  telephone: string;
  statut: StatutAffectation;
  confirmeLe: string;
  /** Dernier changement de l'affectation (désistement, absence). */
  majLe: string;
  contratSigneRestaurant: boolean;
  contratSigneExtra: boolean;
  contratSigneExtraLe: string | null;
  /** Notation après mission, null si pas encore notée. */
  notation: { present: boolean; note: number | null } | null;
  favori: boolean;
}

export interface DemandeSuivi {
  id: string;
  /** Établissement employeur (contrat, facture). */
  restaurantId: string;
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
  /** Établissements de l'utilisateur, avec son rôle dans chacun. */
  etablissements(): Promise<Restaurant[]>;
  /** Établissement affiché : celui choisi (etablissementCourant), sinon le premier. */
  restaurant(): Promise<Restaurant>;
  ajouterEtablissement(e: NouvelEtablissement): Promise<{ resultat: ResultatEtablissement; id?: string }>;
  modifierEtablissement(id: string, m: { nom: string; adresse: AdresseGeo }): Promise<'ok' | 'adresse'>;
  equipe(restaurantId: string): Promise<Membre[]>;
  /** `telephone` au format +26269XXXXXXX. */
  inviter(restaurantId: string, telephone: string, role: Role): Promise<ResultatInvitation>;
  annulerInvitation(restaurantId: string, telephone: string): Promise<void>;
  changerRole(restaurantId: string, utilisateurId: string, role: Role): Promise<'ok' | 'dernierGerant'>;
  retirerMembre(restaurantId: string, utilisateurId: string): Promise<'ok' | 'dernierGerant'>;
  /** Photo de profil d'un extra affecté à une de vos demandes (JPEG base64), null sans photo. */
  photoExtra(extraId: string): Promise<string | null>;
  parametres(): Promise<ParametresTarifaires>;
  publier(d: NouvelleDemande): Promise<{ id: string }>;
  /** Demandes de l'établissement affiché. */
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
