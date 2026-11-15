import type { JourISO } from './dates';

/**
 * Paramètres tarifaires, lus depuis la table `parametres` (une ligne par date d'effet).
 * Le taux horaire brut est le SMIC, revalorisé chaque 1er janvier : jamais en dur dans le code.
 * Chaque demande fige les valeurs en vigueur au moment de sa publication.
 */
export interface ParametresTarifaires {
  dateEffet: JourISO;
  /** SMIC horaire brut, en centimes. */
  tauxHoraireBrutCentimes: number;
  /** Part fixe des frais Kivien par extra, en centimes HT (0 depuis le 15 novembre 2026). */
  fraisMiseEnRelationHTCentimes: number;
  /** Frais Kivien par heure d'extra, en centimes HT (350 depuis le 15 novembre 2026). */
  fraisHoraireHTCentimes: number;
  /** Durée minimum d'une mission, en minutes (120 depuis le 15 novembre 2026). */
  dureeMinimumMinutes: number;
  /** TVA sur les frais Kivien, en pour mille (La Réunion : 85, soit 8,5 %). */
  tvaPourMille: number;
}

/** Paramètres applicables à un jour donné : la dernière ligne dont la date d'effet est passée. */
export function parametresEnVigueur(
  liste: readonly ParametresTarifaires[],
  jour: JourISO,
): ParametresTarifaires {
  let retenu: ParametresTarifaires | undefined;
  for (const p of liste) {
    if (p.dateEffet <= jour && (!retenu || p.dateEffet > retenu.dateEffet)) retenu = p;
  }
  if (!retenu) throw new Error(`Aucun paramètre tarifaire en vigueur au ${jour}`);
  return retenu;
}

/**
 * Frais Kivien d'un extra pour une mission : part fixe + durée × frais horaire, arrondi au centime
 * (même calcul que la base, fonction frais_par_extra_centimes, figé à la publication).
 */
export function fraisParExtraCentimes(
  p: Pick<ParametresTarifaires, 'fraisMiseEnRelationHTCentimes' | 'fraisHoraireHTCentimes'>,
  minutes: number,
): number {
  return (
    p.fraisMiseEnRelationHTCentimes +
    Math.floor((2 * minutes * p.fraisHoraireHTCentimes + 60) / 120)
  );
}
