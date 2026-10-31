import { NBSP } from './espaces';
import { formatHeure } from './temps';

/** Historique d'un extra sur Kivien, lu par l'équipe de l'établissement (fonction confiance_extras). */
export interface ConfianceExtra {
  missions: number;
  notes: number;
  /** Note moyenne × 10 (48 pour 4,8), null sans note. */
  noteMoyenneDixiemes: number | null;
  absences: number;
  dossierComplet: boolean;
}

/** Notes à partir desquelles la moyenne est montrée : une seule note ne dit pas grand-chose. */
export const NOTES_MIN_BADGE = 3;
/** Missions à partir desquelles « Aucune absence » a du sens. */
export const MISSIONS_MIN_PRESENCE = 3;

/** Badges de confiance affichés sous le nom de l'extra, dans le suivi de la demande. */
export function badgesConfiance(c: ConfianceExtra): string[] {
  const b: string[] = [];
  b.push(
    c.missions === 0
      ? 'Première mission sur Kivien'
      : `${c.missions} mission${c.missions > 1 ? 's' : ''} réalisée${c.missions > 1 ? 's' : ''} sur Kivien`,
  );
  if (c.notes >= NOTES_MIN_BADGE && c.noteMoyenneDixiemes !== null) {
    const n = c.noteMoyenneDixiemes;
    b.push(`Note ${Math.floor(n / 10)},${n % 10}${NBSP}sur${NBSP}5`);
  }
  if (c.missions >= MISSIONS_MIN_PRESENCE && c.absences === 0) b.push('Aucune absence');
  if (c.dossierComplet) b.push('Dossier du contrat complet');
  return b;
}

export const textesPointage = {
  titre: 'Pointage',
  arrivee: 'Pointer mon arrivée',
  depart: 'Pointer mon départ',
  aide: 'Sur place : ton arrivée dès 1 h avant le début, puis ton départ à la fin de la mission.',
  arriveeLe: (heure: string) => `Arrivée pointée à ${heure}`,
  departLe: (heure: string) => `Départ pointé à ${heure}`,
  erreur: 'Pointage non enregistré. Vérifie ta connexion et réessaie.',
  tropTot: 'Le pointage ouvre 1 h avant le début de la mission.',
} as const;

/** Ligne du suivi côté établissement : « Arrivée pointée à 18 h 02 · départ à 23 h 10 ». */
export function lignePointage(
  arriveeMinute: number | null,
  departMinute: number | null,
): string | null {
  if (arriveeMinute === null) return null;
  const arrivee = textesPointage.arriveeLe(formatHeure(arriveeMinute));
  return departMinute === null ? arrivee : `${arrivee} · départ à ${formatHeure(departMinute)}`;
}

/** Début de la mission (heure de La Réunion, UTC+4 toute l'année), en millisecondes. */
function instantMission(jour: string, minute: number): number {
  return Date.parse(`${jour}T00:00:00+04:00`) + minute * 60_000;
}

/** Le pointage est proposé de 1 h avant le début à 6 h après la fin (mêmes règles que la base). */
export function pointageOuvert(
  jour: string,
  debut: number,
  fin: number,
  maintenant: Date = new Date(),
): boolean {
  const d = instantMission(jour, debut);
  const duree = (fin > debut ? fin - debut : fin + 1440 - debut) * 60_000;
  const t = maintenant.getTime();
  return t >= d - 3_600_000 && t <= d + duree + 6 * 3_600_000;
}
