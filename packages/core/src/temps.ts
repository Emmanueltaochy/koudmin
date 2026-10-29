import { NBSP } from './espaces';

/** Minutes depuis minuit, 0 à 1439. */
export type MinuteDuJour = number;

const JOUR = 24 * 60;

/** « 18:00 » → 1080. Renvoie null si la saisie est invalide. */
export function lireHeure(saisie: string): MinuteDuJour | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(saisie.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Durée d'un service. Une fin avant le début passe minuit. Début = fin : invalide (null). */
export function dureeMinutes(debut: MinuteDuJour, fin: MinuteDuJour): number | null {
  if (debut === fin) return null;
  return fin > debut ? fin - debut : fin + JOUR - debut;
}

/** 1080 → « 18 h », 690 → « 11 h 30 », 0 → « minuit », 60 → « 1 h ». */
export function formatHeure(minutes: MinuteDuJour): string {
  const t = ((minutes % JOUR) + JOUR) % JOUR;
  if (t === 0) return 'minuit';
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
}

/** « 18 h – minuit » */
export function formatPlage(debut: MinuteDuJour, fin: MinuteDuJour): string {
  return `${formatHeure(debut)}${NBSP}–${NBSP}${formatHeure(fin)}`;
}

/** Durée courte : « 6 h », « 4 h 30 », « 45 min ». */
export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${NBSP}min`;
  return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
}

/** « 6 heures de service. », « 1 heure de service. », « 4 h 30 de service. » */
export function phraseDuree(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h}${NBSP}heure${h > 1 ? 's' : ''} de service.`;
  }
  return `${formatDuree(minutes)} de service.`;
}

/**
 * Normalise une heure tapée : « 1800 », « 18h », « 18h30 », « 9:15 » → « 18:00 », « 18:30 », « 09:15 ».
 * Renvoie la saisie telle quelle si elle reste illisible (la validation la signalera).
 */
export function normaliserHeure(saisie: string): string {
  const s = saisie.trim().toLowerCase().replace('h', ':').replace(/\s/g, '');
  let m = /^(\d{1,2}):?(\d{2})?$/.exec(s.endsWith(':') ? s.slice(0, -1) : s);
  if (!m && /^\d{3,4}$/.test(s)) m = /^(\d{1,2})(\d{2})$/.exec(s);
  if (!m) return saisie;
  const r = `${m[1]!.padStart(2, '0')}:${(m[2] ?? '00').padStart(2, '0')}`;
  return lireHeure(r) === null ? saisie : r;
}
