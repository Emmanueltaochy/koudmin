import { textesEcrans } from './textesEcrans';
import { trouverCommune } from './communes';
import { nirValide } from './contrat';
import { normaliserMobileReunion } from './telephone';
import type { JourISO } from './dates';

const ti = textesEcrans.extra.inscription;
const tc = textesEcrans.extra.contrat;

/** Inscription extra : 5 champs, pas un de plus. */
export interface SaisieInscription {
  prenom: string;
  nom: string;
  telephone: string;
  commune: string;
  aVoiture: boolean | null;
}

export function validerInscription(s: SaisieInscription): Partial<Record<keyof SaisieInscription, string>> {
  const e: Partial<Record<keyof SaisieInscription, string>> = {};
  if (!s.prenom.trim()) e.prenom = ti.erreurPrenom;
  if (!s.nom.trim()) e.nom = ti.erreurNom;
  if (!normaliserMobileReunion(s.telephone)) e.telephone = textesEcrans.connexion.erreurTelephoneExtra;
  if (!trouverCommune(s.commune)) e.commune = ti.erreurCommune;
  if (s.aVoiture === null) e.aVoiture = ti.erreurVoiture;
  return e;
}

/** Longueur minimale, identique à GOTRUE_PASSWORD_MIN_LENGTH sur le serveur. */
export const MOT_DE_PASSE_MIN = 8;

/** Mot de passe choisi à l'inscription : null s'il convient. */
export function validerMotDePasse(m: string): string | null {
  return [...m].length >= MOT_DE_PASSE_MIN ? null : textesEcrans.connexion.erreurMotDePasseCourtExtra;
}

/** « 12/05/2001 » → « 2001-05-12 », null si la date n'existe pas. */
export function lireDate(saisie: string): JourISO | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(saisie.trim());
  if (!m) return null;
  const [, j, mo, a] = m;
  const d = new Date(Date.UTC(Number(a), Number(mo) - 1, Number(j)));
  if (d.getUTCFullYear() !== Number(a) || d.getUTCMonth() !== Number(mo) - 1 || d.getUTCDate() !== Number(j)) return null;
  return `${a}-${mo}-${j}`;
}

/** Infos demandées à la première signature, pour la DPAE. */
export interface SaisieInfosContrat {
  dateNaissance: string;
  lieuNaissance: string;
  nir: string;
  adresse: string;
}

export function validerInfosContrat(
  s: SaisieInfosContrat,
  aujourdhui: JourISO,
): Partial<Record<keyof SaisieInfosContrat, string>> {
  const e: Partial<Record<keyof SaisieInfosContrat, string>> = {};
  const date = lireDate(s.dateNaissance);
  if (!date || date >= aujourdhui || date < '1900-01-01') e.dateNaissance = tc.erreurDate;
  if (!s.lieuNaissance.trim()) e.lieuNaissance = tc.erreurLieu;
  // Facultatif : la DPAE se fait aussi avec la date et le lieu de naissance. S'il est saisi, il doit être juste.
  if (s.nir.trim() && !nirValide(s.nir)) e.nir = tc.erreurNir;
  if (s.adresse.trim().length < 8) e.adresse = tc.erreurAdresse;
  return e;
}
