import { NBSP } from './espaces';
import { jourCourt, jourSemaine, type JourISO } from './dates';
import type { Poste } from './postes';
import { formatHeure, type MinuteDuJour } from './temps';

/** Mission telle qu'affichée dans la liste côté extra. */
export interface MissionResume {
  id: string;
  restaurant: string;
  commune: string;
  distanceMetres: number;
  poste: Poste;
  jour: JourISO;
  debut: MinuteDuJour;
  fin: MinuteDuJour;
  /** Taux figé sur la demande à sa publication. */
  tauxHoraireBrutCentimes: number;
  retourAssure: boolean;
  /** Heure du bus de retour le plus tardif, si connue. */
  busRetour: MinuteDuJour | null;
}

export interface ProfilExtra {
  aVoiture: boolean;
}

/**
 * Sans voiture : retour assuré d'abord, puis distance croissante.
 * Avec voiture : distance croissante. À égalité : jour, heure de début, puis id (tri stable).
 */
export function trierMissions<M extends MissionResume>(missions: readonly M[], profil: ProfilExtra): M[] {
  return [...missions].sort(
    (a, b) =>
      (profil.aVoiture ? 0 : Number(b.retourAssure) - Number(a.retourAssure)) ||
      a.distanceMetres - b.distanceMetres ||
      a.jour.localeCompare(b.jour) ||
      a.debut - b.debut ||
      a.id.localeCompare(b.id),
  );
}

export type FiltreMissions = 'toutes' | 'ceSoir' | 'weekEnd';

/** « Week-end » : vendredi, samedi et dimanche, comme le planning d'un restaurant. */
export function filtrerMissions<M extends MissionResume>(
  missions: readonly M[],
  filtre: FiltreMissions,
  aujourdhui: JourISO,
): M[] {
  if (filtre === 'ceSoir') return missions.filter((m) => m.jour === aujourdhui);
  if (filtre === 'weekEnd') return missions.filter((m) => [5, 6, 0].includes(jourSemaine(m.jour)));
  return [...missions];
}

/** En-tête de carte : badge curcuma pour le jour même, sinon le jour en légende (« sam. 31 »). */
export function etiquetteJour(
  jour: JourISO,
  debut: MinuteDuJour,
  aujourdhui: JourISO,
): { urgent: true; texte: string } | { urgent: false; texte: string } {
  if (jour === aujourdhui) return { urgent: true, texte: debut >= 17 * 60 ? 'Ce soir' : "Aujourd'hui" };
  return { urgent: false, texte: jourCourt(jour) };
}

export type LigneRetour =
  | { type: 'assure'; texte: string }
  | { type: 'bus'; texte: string }
  | { type: 'aucune' };

/** Ligne retour d'une carte, affichée seulement aux profils sans voiture. */
export function ligneRetour(m: MissionResume, profil: ProfilExtra): LigneRetour {
  if (profil.aVoiture) return { type: 'aucune' };
  if (m.retourAssure) return { type: 'assure', texte: 'Retour assuré par le restaurant' };
  if (m.busRetour === null) return { type: 'aucune' };
  // La fin peut passer minuit : on compare sur une même échelle de temps.
  const fin = m.fin > m.debut ? m.fin : m.fin + 24 * 60;
  const bus = m.busRetour >= m.debut ? m.busRetour : m.busRetour + 24 * 60;
  const h = formatHeure(m.busRetour);
  return bus < fin
    ? { type: 'bus', texte: `Dernier bus ${h}${NBSP}: retour à prévoir` }
    : { type: 'bus', texte: `Bus retour à ${h}` };
}
