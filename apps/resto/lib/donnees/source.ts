import type {
  CategorieProspect,
  JourISO,
  ParametresTarifaires,
  Poste,
  ProfilPublic,
  ProspectOsm,
  Secteur,
  StatutAffectation,
  StatutDemande,
  StatutProspect,
  StatutRecherche,
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

/** Tableau de bord de l'espace administrateur (période en jours, montants en centimes). */
export interface TableauAdmin {
  periode_jours: number;
  demande: { demandes: number; places: number; pourvues: number; annulees: number; en_recherche: number; delai_median_minutes: number | null; par_poste: Partial<Record<Poste, number>> };
  offre: { extras: number; nouveaux: number; actifs: number; dispo_7_jours: number; avec_photo: number };
  etablissements: { total: number; nouveaux: number; actifs: number; utilisateurs: number };
  valeur: { frais_ht_centimes: number; tva_centimes: number; salaires_bruts_centimes: number; missions_facturees: number; frais_a_venir_ht_centimes: number };
  qualite: { note_moyenne: number | null; notations: number; absences: number; desistements: number; contrats_signes: number };
  par_mois: { mois: string; demandes: number; places: number; pourvues: number; frais_ht_centimes: number; salaires_bruts_centimes: number }[];
}

export interface EtablissementAdmin {
  id: string; nom: string; commune: string | null; lat: number | null; lng: number | null; secteur: string; siret: string | null;
  telephone: string | null; inscritLe: string; utilisateurs: number; demandes: number; placesPourvues: number; fraisHTCentimes: number; derniereDemande: string | null;
}

export interface ExtraAdmin {
  id: string; prenom: string; nom: string; telephone: string; commune: string; competences: Poste[]; experience: string | null; aVoiture: boolean;
  inscritLe: string; missions: number; absences: number; desistements: number; noteMoyenne: number | null; dispo7Jours: boolean; avecPhoto: boolean;
}

export interface DemandeAdmin {
  id: string; etablissement: string; commune: string; poste: Poste; jour: string; debut: number; fin: number; nbExtras: number;
  pourvues: number; statut: StatutDemande; publieeLe: string; delaiMinutes: number | null; fraisHTCentimes: number;
  intitule: string | null;
}

/** Accès de l'espace administrateur (null : compte sans droit administrateur). */
export interface Prospect {
  id: string;
  nom: string;
  categorie: CategorieProspect;
  commune: string | null;
  adresse: string | null;
  lat: number | null;
  lng: number | null;
  telephone: string | null;
  email: string | null;
  /** Origine de l'e-mail : OpenStreetMap, site de l'établissement, saisie à la main. */
  sourceEmail: 'osm' | 'site' | 'manuel' | null;
  site: string | null;
  statut: StatutProspect;
  notes: string | null;
  desinscrit: boolean;
  dernierEnvoi: string | null;
  envois: number;
}

export interface CampagneProspection {
  id: string;
  sujet: string;
  creeLe: string;
  total: number;
  envoyes: number;
  enAttente: number;
  echecs: number;
}

/** Recherche des établissements faite par le VPS (OpenStreetMap, puis sites web). */
export interface RechercheProspects {
  statut: StatutRecherche;
  demandeeLe: string;
  finLe: string | null;
  trouves: number | null;
  ajoutes: number | null;
  emailsTrouves: number | null;
  erreur: string | null;
}

/** Espace prospection (administrateurs) : fiches, recherche OpenStreetMap, campagnes e-mail. */
export interface SourceProspection {
  /** Dépose une demande : le VPS la prend dans la minute. */
  demanderRecherche(): Promise<void>;
  derniereRecherche(): Promise<RechercheProspects | null>;
  prospects(): Promise<Prospect[]>;
  importer(fiches: ProspectOsm[]): Promise<{ ajoutes: number; misAJour: number }>;
  modifier(id: string, m: { email: string | null; telephone: string | null; statut: StatutProspect; notes: string | null }): Promise<'ok' | 'email'>;
  lancerCampagne(sujet: string, message: string, ids: string[]): Promise<number>;
  campagnes(): Promise<CampagneProspection[]>;
  /** Lien de désinscription (page publique). */
  seDesinscrire(jeton: string): Promise<boolean>;
}

export interface SourceAdmin {
  tableau(jours: number): Promise<TableauAdmin | null>;
  etablissements(): Promise<EtablissementAdmin[]>;
  extras(): Promise<ExtraAdmin[]>;
  demandes(limite?: number): Promise<DemandeAdmin[]>;
  prospection: SourceProspection;
}

/** Compteur de l'équipe Kivien : extras et établissements inscrits, sans donnée personnelle. */
export interface Statistiques {
  extras: { commune: string; competences: Poste[]; experience: string | null; aVoiture: boolean; inscritLe: string; dispoWeekEnd: boolean; dispo7Jours: boolean }[];
  etablissements: { commune: string | null; lat: number | null; lng: number | null; secteur: string; inscritLe: string; demandes: number }[];
}

export interface NouvelleDemande {
  poste: Poste;
  /** Poste libre : intitulé et description écrits par l'établissement. */
  intitule: string | null;
  descriptionPoste: string | null;
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
  intitule: string | null;
  descriptionPoste: string | null;
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

/** Signature d'une partie : image (PNG ou SVG en data URL) et date ISO. */
export interface SignaturesContrat {
  restaurant: { image: string; le: string } | null;
  extra: { image: string; le: string } | null;
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

export type ModePaiement = 'carte_mission' | 'sepa_mission' | 'mensuel_carte' | 'mensuel_sepa';

/** Moyen de paiement des frais Kivien (gérant seulement). */
export interface MoyenPaiement {
  mode: ModePaiement;
  /** « Visa •••• 4242 · 12/28 », null sans carte. */
  carte: string | null;
  /** « IBAN •••• 1234 », null sans mandat. */
  sepa: string | null;
  /** Mandat demandé, en attente de la page GoCardless. */
  sepaEnAttente: boolean;
  mandatValide: boolean;
}

export interface PaiementFrais {
  id: string;
  type: 'mission' | 'mensuel';
  libelle: string;
  moyen: 'carte' | 'sepa';
  montantTTCCentimes: number;
  statut: 'en_cours' | 'reussi' | 'echoue';
  erreur: string | null;
  creeLe: string;
}

export type ActionPaiement =
  | { action: 'carte' }
  | { action: 'carte-confirmer'; session: string }
  | { action: 'sepa' }
  | { action: 'sepa-confirmer' }
  | { action: 'mode'; mode: ModePaiement }
  | { action: 'reessayer'; paiement: string };

/** Réponse de la fonction serveur « paiement » : lien vers Stripe ou GoCardless, ou statut. */
export interface ReponsePaiement {
  url?: string;
  statut?: 'ok' | 'attente' | 'reussi' | 'echoue' | 'en_cours';
  erreur?: string | null;
}

export interface SourcePaiement {
  moyen(restaurantId: string): Promise<MoyenPaiement>;
  historique(restaurantId: string): Promise<PaiementFrais[]>;
  aRegler(restaurantId: string): Promise<{ misesEnRelation: number; ttcCentimes: number }>;
  agir(restaurantId: string, a: ActionPaiement): Promise<ReponsePaiement>;
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
  /** null : compte sans accès administrateur. */
  statistiques(): Promise<Statistiques | null>;
  admin: SourceAdmin;
  paiement: SourcePaiement;
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
  /** Signatures du contrat (images en data URL) et leurs dates, pour le PDF. */
  signatures(affectationId: string): Promise<SignaturesContrat>;
  infosDPAE(affectationId: string): Promise<InfosDPAE | null>;
  noter(affectationId: string, n: Notation): Promise<void>;
  favoris(): Promise<Favori[]>;
  retirerFavori(extraId: string): Promise<void>;
  factures(): Promise<Facture[]>;
  /** Prévient à chaque changement d'une demande ou de ses affectations. */
  ecouter(rappel: () => void): () => void;
}

export class ErreurReseau extends Error {}
