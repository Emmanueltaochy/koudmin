import { NBSP } from './espaces';

/** Date calendaire « AAAA-MM-JJ », à l'heure de La Réunion. */
export type JourISO = string;

/** La Réunion : UTC+4, sans heure d'été. Pas de dépendance à Intl (léger sur Hermes). */
const DECALAGE_REUNION_MS = 4 * 60 * 60 * 1000;

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const MOIS_COURTS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function enUTC(jour: JourISO): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour);
  if (!m) throw new RangeError(`Jour invalide : ${jour}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

const versISO = (d: Date): JourISO => d.toISOString().slice(0, 10);

export function aujourdhuiReunion(maintenant: Date = new Date()): JourISO {
  return versISO(new Date(maintenant.getTime() + DECALAGE_REUNION_MS));
}

/** Minute du jour à La Réunion. */
export function minuteReunion(maintenant: Date = new Date()): number {
  const d = new Date(maintenant.getTime() + DECALAGE_REUNION_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function ajouterJours(jour: JourISO, n: number): JourISO {
  const d = enUTC(jour);
  d.setUTCDate(d.getUTCDate() + n);
  return versISO(d);
}

/** 0 = dimanche … 6 = samedi. */
export function jourSemaine(jour: JourISO): number {
  return enUTC(jour).getUTCDay();
}

const quantieme = (n: number) => (n === 1 ? '1er' : String(n));

/** « ven. 30 » */
export function jourCourt(jour: JourISO): string {
  const d = enUTC(jour);
  return `${JOURS_COURTS[d.getUTCDay()]}${NBSP}${quantieme(d.getUTCDate())}`;
}

/** « 1er nov. » */
export function jourMoisCourt(jour: JourISO): string {
  const d = enUTC(jour);
  return `${quantieme(d.getUTCDate())}${NBSP}${MOIS_COURTS[d.getUTCMonth()]}`;
}

/** « Vendredi 30 octobre » */
export function dateLongue(jour: JourISO): string {
  const d = enUTC(jour);
  return `${majuscule(JOURS[d.getUTCDay()]!)} ${quantieme(d.getUTCDate())} ${MOIS[d.getUTCMonth()]}`;
}

/** « Dimanche » */
export function nomJour(jour: JourISO): string {
  return majuscule(JOURS[jourSemaine(jour)]!);
}

export interface ChoixDate {
  jour: JourISO;
  /** Légende 13 px : « Ce soir », « Demain », « Dimanche ». */
  libelle: string;
  /** Valeur 16 px : « ven. 30 », « sam. 31 », « 1er nov. ». */
  valeur: string;
}

/** Les 3 cases de date du formulaire de demande. */
export function choixDates(aujourdhui: JourISO): [ChoixDate, ChoixDate, ChoixDate] {
  const demain = ajouterJours(aujourdhui, 1);
  const apres = ajouterJours(aujourdhui, 2);
  return [
    { jour: aujourdhui, libelle: 'Ce soir', valeur: jourCourt(aujourdhui) },
    { jour: demain, libelle: 'Demain', valeur: jourCourt(demain) },
    { jour: apres, libelle: nomJour(apres), valeur: jourMoisCourt(apres) },
  ];
}

/**
 * Quand a lieu la mission, pour l'insérer dans une phrase :
 * « ce soir », « aujourd'hui » (avant 17 h), « demain », « samedi » (dans la semaine),
 * sinon « le 12 novembre ».
 */
export function quandMission(jour: JourISO, debut: number, aujourdhui: JourISO): string {
  if (jour === aujourdhui) return debut >= 17 * 60 ? 'ce soir' : "aujourd'hui";
  if (jour === ajouterJours(aujourdhui, 1)) return 'demain';
  const ecart = Math.round((enUTC(jour).getTime() - enUTC(aujourdhui).getTime()) / 86_400_000);
  if (ecart > 1 && ecart < 7) return JOURS[jourSemaine(jour)]!;
  const d = enUTC(jour);
  return `le ${quantieme(d.getUTCDate())} ${MOIS[d.getUTCMonth()]}`;
}

/** Début et fin d'une mission en millisecondes (horodatage absolu). La fin peut passer minuit. */
export function bornesMission(jour: JourISO, debut: number, fin: number): { debut: number; fin: number } {
  const minuit = enUTC(jour).getTime() - DECALAGE_REUNION_MS;
  const d = minuit + debut * 60_000;
  const f = minuit + (fin > debut ? fin : fin + 24 * 60) * 60_000;
  return { debut: d, fin: f };
}

/** Lundi de la semaine du jour donné (semaine du lundi au dimanche). */
export function lundiDeLaSemaine(jour: JourISO): JourISO {
  return ajouterJours(jour, -((jourSemaine(jour) + 6) % 7));
}

/** Les 7 jours d'une semaine, du lundi au dimanche. */
export function joursDeLaSemaine(lundi: JourISO): JourISO[] {
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}
