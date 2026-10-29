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
  /** Frais Koudmin par extra, en centimes HT. */
  fraisMiseEnRelationHTCentimes: number;
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
