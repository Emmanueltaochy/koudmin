import { NBSP } from './espaces';
import type { JourISO } from './dates';
import { formatEuros } from './montants';
import type { Poste } from './postes';
import { tauxAutorise } from './salaire';
import { dureeMinutes, lireHeure } from './temps';

/** Nombre d'extras par demande. Au-delà, le restaurateur publie une seconde demande. */
export const NB_EXTRAS_MIN = 1;
export const NB_EXTRAS_MAX = 10;
export const CONSIGNES_MAX = 500;
/** Garde-fou de saisie : un taux au-delà est presque sûrement une faute de frappe. */
export const TAUX_MAX_CENTIMES = 10_000;

/** « 12,31 », « 12.31 », « 12,3 », « 12 », « 12,31 € » → centimes. null si illisible. */
export function lireMontant(saisie: string): number | null {
  const s = saisie.replace(/[\s €]/g, '').replace(',', '.');
  const m = /^(\d{1,4})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

/** Centimes → « 12,31 », pour préremplir un champ de saisie. */
export function montantSaisie(centimes: number): string {
  return `${Math.floor(centimes / 100)},${String(centimes % 100).padStart(2, '0')}`;
}

export interface SaisieDemande {
  poste: Poste | null;
  jour: JourISO | null;
  /** « HH:MM » */
  debut: string;
  fin: string;
  /** Saisie libre, ex. « 12,31 ». */
  taux: string;
  adresse: string;
  retourAssure: boolean;
  nbExtras: number;
  consignes: string;
}

export type ChampDemande =
  | 'poste'
  | 'jour'
  | 'horaires'
  | 'taux'
  | 'adresse'
  | 'nbExtras'
  | 'consignes';

/** Ordre d'affichage des champs, pour placer le focus sur la première erreur. */
export const ORDRE_CHAMPS: ChampDemande[] = ['poste', 'jour', 'horaires', 'taux', 'adresse', 'nbExtras', 'consignes'];

export type ErreursDemande = Partial<Record<ChampDemande, string>>;

/** Saisie par défaut, pensée pour le service du soir : « Ce soir », « 18 h – minuit ». */
export function saisieParDefaut(aujourdhui: JourISO, smicCentimes: number): SaisieDemande {
  return {
    poste: 'serveur',
    jour: aujourdhui,
    debut: '18:00',
    fin: '00:00',
    taux: montantSaisie(smicCentimes),
    adresse: '',
    retourAssure: false,
    nbExtras: 2,
    consignes: '',
  };
}

/**
 * Valide une demande. `maintenant` : jour et minute à La Réunion, pour refuser un horaire
 * déjà commencé. Renvoie un message par champ fautif (vide si tout est bon).
 */
export function validerDemande(
  s: SaisieDemande,
  smicCentimes: number,
  maintenant: { jour: JourISO; minute: number },
): ErreursDemande {
  const e: ErreursDemande = {};
  if (!s.poste) e.poste = 'Choisissez un poste.';
  if (!s.jour) e.jour = 'Choisissez une date.';
  else if (s.jour < maintenant.jour) e.jour = 'Cette date est passée.';

  const debut = lireHeure(s.debut);
  const fin = lireHeure(s.fin);
  if (debut === null || fin === null) e.horaires = "Indiquez l'heure de début et de fin.";
  else if (dureeMinutes(debut, fin) === null) e.horaires = "L'heure de fin doit être différente du début.";
  else if (s.jour === maintenant.jour && debut <= maintenant.minute) e.horaires = 'Cet horaire est déjà passé.';

  const taux = lireMontant(s.taux);
  if (taux === null) e.taux = 'Indiquez un taux horaire, par exemple 12,31.';
  else if (!tauxAutorise(taux, smicCentimes))
    e.taux = `Minimum légal${NBSP}: ${formatEuros(smicCentimes)} de l'heure.`;
  else if (taux > TAUX_MAX_CENTIMES) e.taux = 'Vérifiez le taux horaire.';

  if (!s.adresse.trim()) e.adresse = "Indiquez l'adresse du service.";
  if (!Number.isInteger(s.nbExtras) || s.nbExtras < NB_EXTRAS_MIN || s.nbExtras > NB_EXTRAS_MAX)
    e.nbExtras = `Entre ${NB_EXTRAS_MIN} et ${NB_EXTRAS_MAX} extras par demande.`;
  if (s.consignes.length > CONSIGNES_MAX) e.consignes = `${CONSIGNES_MAX} caractères maximum.`;
  return e;
}
