import type { JourISO } from './dates';
import { brutMissionCentimes } from './gains';
import type { Poste } from './postes';
import { netEstimeEuros } from './salaire';

/** Une mission d'un extra, vue par l'admin (fonction admin_missions_extra). */
export interface MissionFicheExtra {
  affectationId: string;
  demandeId: string;
  etablissement: string;
  commune: string;
  poste: Poste;
  intitule: string | null;
  jour: JourISO;
  debut: number;
  fin: number;
  tauxHoraireBrutCentimes: number;
  statut: 'confirmee' | 'desistee' | 'absente' | 'terminee';
  statutDemande: 'publiee' | 'pourvue' | 'annulee' | 'terminee';
  desistementTardif: boolean;
  contratSigneExtra: boolean;
  contratSigneRestaurant: boolean;
  arriveeLe: string | null;
  departLe: string | null;
  present: boolean | null;
  note: number | null;
  favori: boolean;
}

export type EtatMissionFiche = 'a_venir' | 'faite' | 'absente' | 'desistee' | 'annulee';

export const LIBELLES_ETAT_MISSION: Record<EtatMissionFiche, string> = {
  a_venir: 'À venir',
  faite: 'Faite',
  absente: 'Absence',
  desistee: 'Désistement',
  annulee: 'Annulée par l’établissement',
};

/** Fin de la mission (La Réunion, UTC+4 toute l'année), en millisecondes. */
function finMission(m: Pick<MissionFicheExtra, 'jour' | 'debut' | 'fin'>): number {
  const duree = m.fin > m.debut ? m.fin - m.debut : m.fin + 1440 - m.debut;
  return Date.parse(`${m.jour}T00:00:00+04:00`) + (m.debut + duree) * 60_000;
}

export function etatMissionFiche(
  m: MissionFicheExtra,
  maintenant: Date = new Date(),
): EtatMissionFiche {
  if (m.statut === 'desistee') return 'desistee';
  if (m.statut === 'absente' || m.present === false) return 'absente';
  if (m.statutDemande === 'annulee') return 'annulee';
  return finMission(m) <= maintenant.getTime() ? 'faite' : 'a_venir';
}

/** Chiffres en tête de la fiche. Les salaires sont versés par les établissements, pas par Kivien. */
export function resumeFicheExtra(missions: MissionFicheExtra[], maintenant: Date = new Date()) {
  const etats = missions.map((m) => ({ m, e: etatMissionFiche(m, maintenant) }));
  const faites = etats.filter((x) => x.e === 'faite').map((x) => x.m);
  const aVenir = etats.filter((x) => x.e === 'a_venir').map((x) => x.m);
  const notes = missions.map((m) => m.note).filter((n): n is number => n !== null);
  const brutFaitCentimes = faites.reduce((s, m) => s + brutMissionCentimes(m), 0);
  return {
    faites: faites.length,
    aVenir: aVenir.length,
    absences: etats.filter((x) => x.e === 'absente').length,
    desistements: etats.filter((x) => x.e === 'desistee').length,
    desistementsTardifs: missions.filter((m) => m.statut === 'desistee' && m.desistementTardif)
      .length,
    notes: notes.length,
    /** Note moyenne × 10 (48 pour 4,8), null sans note. */
    noteMoyenneDixiemes: notes.length
      ? Math.round((notes.reduce((s, n) => s + n, 0) * 10) / notes.length)
      : null,
    brutFaitCentimes,
    netFaitEuros: brutFaitCentimes > 0 ? netEstimeEuros(brutFaitCentimes) : 0,
    brutAVenirCentimes: aVenir.reduce((s, m) => s + brutMissionCentimes(m), 0),
    etablissements: new Set(faites.map((m) => m.etablissement)).size,
  };
}

export const textesFicheExtra = {
  voirFiche: 'Voir la fiche',
  retour: 'Retour à la liste des extras',
  introuvable: 'Extra introuvable.',
  chiffres: {
    faites: 'Missions faites',
    aVenir: 'À venir',
    brut: 'Salaires bruts reçus',
    brutAide: 'Congés payés compris, versés par les établissements. Net estimé',
    aVenirBrut: 'Brut des missions à venir',
    note: 'Note moyenne',
    fiabilite: 'Absences / désistements',
    etablissements: 'Établissements différents',
  },
  sections: { profil: 'Profil', dossier: 'Dossier', origine: 'Origine', missions: 'Missions' },
  champs: {
    mobile: 'Mobile',
    email: 'E-mail',
    commune: 'Commune',
    voiture: 'Voiture',
    metiers: 'Métiers',
    experience: 'Expérience',
    langues: 'Langues',
    presentation: 'Présentation',
    inscription: 'Inscription',
    infosContrat: 'Infos du contrat (DPAE)',
    cgu: 'Conditions générales',
    photo: 'Photo',
    alertes: 'Alertes de missions par e-mail',
    dispos: 'Créneaux libres sur 14 jours',
    reponse: 'Comment a connu Kivien',
    premiereVisite: 'Première visite',
  },
  valeurs: {
    oui: 'Oui',
    non: 'Non',
    renseignees: 'Renseignées',
    aCompleter: 'À compléter',
    acceptees: (version: string) =>
      `Acceptées (version du ${String(version).split('-').reverse().join('/')})`,
    nonAcceptees: 'Pas encore acceptées',
    pasDAdresse: 'Pas d’adresse confirmée',
    activees: 'Activées',
    coupees: 'Coupées',
  },
  colonnes: {
    date: 'Date',
    etablissement: 'Établissement',
    poste: 'Poste',
    etat: 'État',
    contrat: 'Contrat',
    pointage: 'Pointage',
    note: 'Note',
    brut: 'Brut',
  },
  contrat: {
    signe: 'Signé des deux côtés',
    extra: 'Signé par l’extra',
    etablissement: 'Signé par l’établissement',
    aucun: 'À signer',
  },
  favori: 'Favori de l’établissement',
  tardif: 'tardif',
  aucuneMission: 'Aucune mission pour l’instant.',
} as const;
