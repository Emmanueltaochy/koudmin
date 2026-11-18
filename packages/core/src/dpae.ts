/**
 * DPAE automatique : l'établissement donne mandat à Kivien, qui envoie la déclaration préalable à
 * l'embauche à l'Urssaf (serveur : deploy/vps/dpae.sh). Fermée tant que l'admin ne l'a pas ouverte.
 */

/** Où en est la DPAE d'une embauche (table `dpae`). */
export type StatutDpae = 'a_envoyer' | 'envoyee' | 'acceptee' | 'refusee' | 'a_faire' | 'a_annuler';

export interface EtatDpae {
  /** L'envoi automatique est ouvert par Kivien. */
  ouverte: boolean;
  /** L'établissement a donné mandat. */
  mandat: boolean;
  /** Kivien se charge de cette embauche (mandat donné avant, mission pas commencée). */
  prevue: boolean;
  statut: StatutDpae | null;
  motif: string | null;
  reference: string | null;
  envoyeeLe: string | null;
}

/** Ce que l'établissement voit et doit faire pour cette DPAE. */
export type VueDpae =
  'manuelle' | 'proposer' | 'attente' | 'envoyee' | 'faite' | 'a_reprendre' | 'a_annuler';

export function vueDpae(e: EtatDpae | null): VueDpae {
  if (!e || !e.ouverte) return 'manuelle';
  if (e.statut === 'acceptee') return 'faite';
  if (e.statut === 'envoyee') return 'envoyee';
  if (e.statut === 'refusee' || e.statut === 'a_faire') return 'a_reprendre';
  if (e.statut === 'a_annuler') return 'a_annuler';
  if (e.statut === 'a_envoyer' || e.prevue) return 'attente';
  return e.mandat ? 'manuelle' : 'proposer';
}

/** Code APE (NAF) saisi « 56.10A », « 5610a »… rendu « 5610A ». */
export function normaliserCodeApe(saisie: string): string {
  return saisie.replace(/[\s.]/g, '').toUpperCase();
}

export function codeApeValide(saisie: string): boolean {
  return /^[0-9]{4}[A-Z]$/.test(normaliserCodeApe(saisie));
}

/** Code du service de santé au travail (médecine du travail), tel que l'Urssaf le connaît. */
export function normaliserServiceSante(saisie: string): string {
  return saisie.replace(/\s/g, '').toUpperCase();
}

export function serviceSanteValide(saisie: string): boolean {
  return /^[A-Z0-9]{1,10}$/.test(normaliserServiceSante(saisie));
}

export interface ErreursMandatDpae {
  codeApe?: string;
  serviceSante?: string;
  accord?: string;
}

export function validerMandatDpae(m: {
  codeApe: string;
  serviceSante: string;
  accord: boolean;
}): ErreursMandatDpae {
  const e: ErreursMandatDpae = {};
  if (!codeApeValide(m.codeApe)) e.codeApe = textesDpae.mandat.erreurApe;
  if (!serviceSanteValide(m.serviceSante)) e.serviceSante = textesDpae.mandat.erreurSante;
  if (!m.accord) e.accord = textesDpae.mandat.erreurAccord;
  return e;
}

export const textesDpae = {
  /** Page du contrat, espace pro. */
  contrat: {
    titre: 'DPAE',
    proposer:
      "Kivien peut envoyer la DPAE à l'Urssaf à votre place, dès que l'extra a signé son contrat.",
    proposerLien: 'Activer la DPAE automatique',
    attente:
      "Kivien envoie la DPAE à l'Urssaf dès que l'extra a signé son contrat, et au plus tard 3 heures avant le début. Rien à faire de votre côté.",
    envoyee: "DPAE envoyée à l'Urssaf. L'accusé de réception arrive en général dans l'heure.",
    faite: 'DPAE faite.',
    reference: (ref: string) => `Référence Urssaf : ${ref}`,
    aReprendre:
      "La DPAE n'a pas pu être envoyée automatiquement. Faites-la vous-même avant le début du service.",
    aAnnuler:
      "L'extra s'est désisté après l'envoi de la DPAE. Annulez-la sur net-entreprises.fr, ou appelez l'Urssaf.",
    motif: (motif: string) => `Motif : ${motif}`,
  },
  /** Page Établissements : mandat donné par le gérant. */
  mandat: {
    titre: 'DPAE automatique',
    inactif:
      "Kivien envoie vos DPAE à l'Urssaf à votre place, dès que l'extra a signé son contrat.",
    activer: 'Activer la DPAE automatique',
    actif: 'DPAE automatique activée',
    resume: (codeApe: string, serviceSante: string) =>
      `Code APE ${codeApe} · service de santé au travail ${serviceSante}`,
    codeApe: 'Code APE (NAF)',
    codeApeAide: 'Sur votre extrait Kbis ou vos bulletins de paie. Exemple : 5610A.',
    serviceSante: 'Code de votre service de santé au travail',
    serviceSanteAide:
      "Il figure sur l'accusé de réception d'une DPAE précédente. En cas de doute, demandez-le à votre service de santé au travail.",
    accord:
      "Je donne mandat à Kivien pour envoyer à l'Urssaf, en mon nom, les DPAE des extras embauchés par cet établissement sur Kivien. Je reste l'employeur et je peux retirer ce mandat à tout moment.",
    valider: 'Donner mandat',
    modifier: 'Modifier',
    retirer: 'Retirer le mandat',
    retire: 'Mandat retiré. Vous faites de nouveau vos DPAE vous-même.',
    enregistre: 'Mandat enregistré. Kivien envoie vos prochaines DPAE.',
    fermer: 'Fermer',
    erreurApe: 'Indiquez un code APE de 4 chiffres et 1 lettre, par exemple 5610A.',
    erreurSante: 'Indiquez le code de votre service de santé au travail (lettres et chiffres).',
    erreurAccord: 'Cochez la case pour donner mandat.',
    erreur: 'Mandat non enregistré. Vérifiez votre connexion et réessayez.',
  },
  /** Espace admin. */
  admin: {
    titre: 'DPAE automatique',
    aide: "Kivien envoie à l'Urssaf les DPAE des établissements qui ont donné mandat. À ouvrir seulement quand le compte Urssaf de Kivien est branché sur le serveur (deploy/vps/configurer-dpae.sh).",
    ouvrir: 'Ouvrir la DPAE automatique',
    fermee: 'Fermée : chaque établissement fait ses DPAE lui-même.',
    ouverte: 'Ouverte : les établissements peuvent donner mandat.',
    compteurs: (mandats: number, enCours: number, acceptees: number, aReprendre: number) =>
      `${mandats} mandat${mandats > 1 ? 's' : ''} · ${enCours} en cours · ${acceptees} acceptée${acceptees > 1 ? 's' : ''} · ${aReprendre} à reprendre`,
    dernieres: 'Dernières DPAE',
    aucune: 'Aucune DPAE pour le moment.',
    erreur: 'Réglage non enregistré. Réessayez.',
  },
} as const;

export const LIBELLES_STATUT_DPAE: Record<StatutDpae, string> = {
  a_envoyer: 'En attente',
  envoyee: 'Envoyée',
  acceptee: 'Acceptée',
  refusee: "Refusée par l'Urssaf",
  a_faire: "À faire par l'établissement",
  a_annuler: 'À annuler',
};
