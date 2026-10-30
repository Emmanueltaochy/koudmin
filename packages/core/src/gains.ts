import type { JourISO } from './dates';
import type { Poste } from './postes';
import { brutParExtraCentimes, netEstimeEuros } from './salaire';
import { dureeMinutes } from './temps';

/** Mission de l'extra avec son contrat (« Mes gains »). */
export interface MissionGain {
  demandeId: string;
  restaurant: string;
  commune: string;
  poste: Poste;
  intitule?: string | null;
  jour: JourISO;
  debut: number;
  fin: number;
  tauxHoraireBrutCentimes: number;
  /** Heure de fin passée. */
  effectuee: boolean;
  contratSigneExtra: boolean;
  contratSigneRestaurant: boolean;
}

export interface TotalGains {
  missions: number;
  brutCentimes: number;
  /** Net estimé du total (pas la somme des nets arrondis). */
  netEuros: number;
}

/** Salaire brut d'une mission, congés payés compris, d'après son contrat. */
export function brutMissionCentimes(m: Pick<MissionGain, 'debut' | 'fin' | 'tauxHoraireBrutCentimes'>): number {
  return brutParExtraCentimes(dureeMinutes(m.debut, m.fin) ?? 0, m.tauxHoraireBrutCentimes);
}

function total(liste: MissionGain[]): TotalGains {
  const brutCentimes = liste.reduce((s, m) => s + brutMissionCentimes(m), 0);
  return { missions: liste.length, brutCentimes, netEuros: brutCentimes > 0 ? netEstimeEuros(brutCentimes) : 0 };
}

/**
 * Gains de l'extra : seules comptent les missions dont l'extra a signé le contrat.
 * « Ce mois-ci » et « cette année » : missions effectuées ; « à venir » : missions confirmées pas encore faites.
 */
export function resumeGains(liste: MissionGain[], aujourdhui: JourISO) {
  const avecContrat = liste.filter((m) => m.contratSigneExtra);
  const faites = avecContrat.filter((m) => m.effectuee);
  return {
    ceMois: total(faites.filter((m) => m.jour.slice(0, 7) === aujourdhui.slice(0, 7))),
    cetteAnnee: total(faites.filter((m) => m.jour.slice(0, 4) === aujourdhui.slice(0, 4))),
    aVenir: total(avecContrat.filter((m) => !m.effectuee)),
  };
}
