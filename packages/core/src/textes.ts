import { NBSP } from './espaces';
import { formatEuros, formatHT } from './montants';
import { formatDuree, formatHeure } from './temps';

/**
 * Textes validés (README), partagés par l'app extra et le site restaurateur.
 * Règles : pas de point d'exclamation, pas d'émoji, créole limité à kivien / péi / mi lé la,
 * aucune mention d'âge, formulations neutres en genre. Vérifié par test/textes.test.ts.
 */
export const textes = {
  signature: 'Les extras péi, en 2 heures.',
  resto: {
    demande: {
      titre: 'Trouver un extra',
      sousTitre: 'Les extras proches sont prévenus dès la publication.',
      poste: 'Poste',
      date: 'Date',
      horaires: 'Horaires',
      horaireAutre: 'Autre',
      debut: 'Début',
      fin: 'Fin',
      taux: 'Taux horaire brut',
      tauxSuffixe: '/ heure',
      tauxLegende: 'Minimum légal. Vous pouvez le monter, pas le baisser.',
      adresse: 'Adresse du service',
      adressePlaceholder: 'Numéro, rue, commune',
      adresseErreur: "Indiquez l'adresse du service.",
      retour: 'Je peux raccompagner ou payer le taxi du retour',
      retourLegende: 'Facultatif. Votre demande passe en tête pour les extras sans voiture.',
      nbExtras: "Nombre d'extras",
      consignes: 'Consignes',
      facultatif: 'Facultatif',
      consignesPlaceholder: 'Tenue, parking, entrée du personnel',
      salaires: 'Salaires bruts estimés',
      frais: 'Frais Kivien',
      envoyer: 'Trouver un extra',
      envoi: 'Envoi de la demande',
      contrat: "Contrat d'extra rédigé pour vous.",
    },
  },
  extra: {
    missions: {
      titre: 'Missions',
      filtres: { toutes: 'Toutes', ceSoir: 'Ce soir', weekEnd: 'Week-end' },
      chargement: 'Recherche des missions près de toi',
      videTitre: "Pas de mission près de toi pour l'instant.",
      videTexte: "Coche tes soirées libres. On te prévient dès qu'un restaurant a besoin de toi.",
      videAction: 'Mettre à jour mes dispos',
      horsLigneTitre: 'Pas de réseau.',
      horsLigneTexte: "Les missions s'afficheront dès que la connexion revient.",
      horsLigneAction: 'Réessayer',
      congesCompris: 'brut, congés payés compris',
      onglets: { missions: 'Missions', dispos: 'Dispos', gains: 'Gains', profil: 'Profil' },
    },
    detail: {
      adresseApres: 'Adresse exacte après confirmation.',
      itineraire: 'Itinéraire',
      appeler: 'Appeler le restaurant',
      retourAssure: 'Retour assuré par le restaurant',
      retourAssureDetail: 'Raccompagnement ou taxi payé après le service.',
      brutDetail: 'brut, congés payés compris.',
      contrat: "Contrat d'extra à signer sur ton téléphone. Pas besoin de SIRET.",
      miLeLa: 'Mi lé la',
      envoi: 'On prévient le restaurant',
      signer: 'Signer mon contrat',
      regleAbsence:
        `Un empêchement${NBSP}? Préviens au moins 4${NBSP}h avant. Une absence sans prévenir = exclusion.`,
      nePlusVenir: 'Je ne peux plus venir',
      priseTitre: 'Mission déjà prise.',
      voirMissions: 'Voir les missions',
    },
    desistement: {
      info: 'Le restaurant sera prévenu tout de suite.',
      confirmer: 'Confirmer',
      annuler: 'Annuler',
    },
  },
} as const;

const fois = `${NBSP}×${NBSP}`;

/** « 4 missions près de toi · retour assuré en premier » */
export function legendeListe(nb: number, sansVoiture: boolean): string {
  const base = `${nb} mission${nb > 1 ? 's' : ''} près de toi`;
  return sansVoiture ? `${base} · retour assuré en premier` : base;
}

/** « 81,25 € brut, congés payés compris » */
export function legendeBrut(brutCentimes: number): string {
  return `${formatEuros(brutCentimes)} ${textes.extra.missions.congesCompris}`;
}

/** « 6 h × 12,31 € brut. Payé par le restaurant. » */
export function detailCalculExtra(minutes: number, tauxCentimes: number): string {
  return `${formatDuree(minutes)}${fois}${formatEuros(tauxCentimes)} brut. Payé par le restaurant.`;
}

/** « 2 × 6 h × 12,31 €, + 10 % de congés payés. Versés par vous aux extras, hors charges patronales. » */
export function legendeSalaires(nbExtras: number, minutes: number, tauxCentimes: number): string {
  const n = nbExtras > 1 ? `${nbExtras}${fois}` : '';
  const verses = nbExtras > 1 ? 'Versés par vous aux extras' : "Versé par vous à l'extra";
  return `${n}${formatDuree(minutes)}${fois}${formatEuros(tauxCentimes)}, + 10${NBSP}% de congés payés. ${verses}, hors charges patronales.`;
}

/** « 2 × 25 € HT. Extra absent et non remplacé : non facturé. » */
export function legendeFrais(nbExtras: number, fraisCentimes: number): string {
  const n = nbExtras > 1 ? `${nbExtras}${fois}` : '';
  return `${n}${formatHT(fraisCentimes)}. Extra absent et non remplacé${NBSP}: non facturé.`;
}

/** « 25 € HT par extra » */
export function fraisParExtra(fraisCentimes: number): string {
  return `${formatHT(fraisCentimes)} par extra`;
}

/** « 2 champs à compléter. » */
export function champsACompleter(nb: number): string {
  return `${nb} champ${nb > 1 ? 's' : ''} à compléter.`;
}

const leJourMeme = (quand: string) => quand === 'ce soir' || quand === "aujourd'hui";

/** « C'est confirmé. On t'attend à 18 h. » ; un autre jour : « On t'attend samedi à 18 h. » */
export function confirmationExtra(debut: number, quand = 'ce soir'): string {
  const jour = leJourMeme(quand) ? '' : `${quand} `;
  return `C'est confirmé. On t'attend ${jour}à ${formatHeure(debut)}.`;
}

/** Notification restaurateur : « Kévin a dit mi lé la. Arrivée prévue à 18 h. » */
export function notificationConfirmation(prenom: string, debut: number): string {
  return `${prenom} a dit mi lé la. Arrivée prévue à ${formatHeure(debut)}.`;
}

/** Bottom sheet « Mission déjà prise ». `missionsRestantes` : autres missions du même jour. */
export function textePrise(missionsRestantes: number, quand = 'ce soir'): string {
  const n = missionsRestantes;
  const base = "Quelqu'un a répondu avant toi.";
  if (n === 0) return base;
  return `${base} ${n} mission${n > 1 ? 's' : ''} ${n > 1 ? "t'attendent" : "t'attend"} encore ${quand}.`;
}

/** « 2,1 km · entrée du personnel côté cuisine » */
export function legendeAcces(distance: string, acces: string | null): string {
  return acces ? `${distance} · ${acces}` : distance;
}

/** « Tu ne viens plus ce soir ? » / « Tu ne viens plus samedi ? » */
export function questionDesistement(quand: string): string {
  return `Tu ne viens plus ${quand}${NBSP}?`;
}
