import { NBSP } from './espaces';
import { formatEuros, formatHT } from './montants';
import { brutParExtraCentimes, CONGES_PAYES_POURCENT, netEstimeEuros } from './salaire';

/**
 * Textes de la page d'accueil publique (kivien.re), repris de la maquette « Landing page v3 ».
 * Adaptations neutres (règle validée pour tous les textes) :
 *  - « Serveur, plonge, commis, barman » → « Salle, plonge, commis, bar » ; « Serveur » → « Service en salle » ;
 *  - « s'il ne vient pas » → « en cas d'absence » ; « Tu es embauché » → « Tu signes » ;
 *  - « si l'extra est venu » → « si l'extra a fait la mission » ; « pas de remplaçant » → « pas de remplacement ».
 * Les montants viennent des paramètres en vigueur (table `parametres`), jamais de valeurs en dur.
 */
const h = (s: string) => s.replace(/ (h|€|HT)(?=\s|$|[.,:])/g, `${NBSP}$1`).replace(/(\d\u00a0h) (\d)/g, `$1${NBSP}$2`);

export const textesVitrine = {
  nav: {
    trouver: 'Trouver un extra',
    devenir: 'Devenir extra',
    garanties: 'Garanties',
    tarif: 'Tarif',
    seConnecter: 'Se connecter',
    creerCompte: 'Créer un compte',
  },
  promesse: {
    surtitre: 'Restaurants, hôtels et bars de La Réunion',
    titre: 'Un extra en 2 heures.',
    texte: 'Salle, plonge, commis, bar, réception. Pour ce soir, demain ou samedi.',
    bouton: 'Trouver un extra',
    sousBouton: "Contrat d'extra rédigé pour vous. Environ 20 % moins cher que l’intérim.",
    chiffreDelai: h('2 h'),
    legendeDelai: 'maximum pour trouver',
    legendeFrais: 'la mise en relation',
    chiffreAbsence: h('0 €'),
    legendeAbsence: "en cas d'absence",
    confirmationHeure: h('Confirmé · 15 h 47'),
    confirmation: h('Kévin a dit mi lé la. Arrivée prévue à 18 h.'),
  },
  confiance: {
    titre: 'Ils trouvent leurs extras avec Kivien',
    logo: 'Logo partenaire',
  },
  etapes: {
    surtitre: 'COMMENT ÇA MARCHE',
    titre: 'Trois étapes, un après-midi.',
    texte: 'Un samedi au Boucan Grillé, de la demande au contrat signé.',
    liste: [
      { n: '1', heure: h('15 h 02'), titre: 'Vous publiez le besoin.', texte: 'Poste, date, horaires, adresse, consignes. Un seul formulaire, une minute.' },
      { n: '2', heure: h('15 h 47'), titre: 'Un extra dit mi lé la.', texte: "Vous voyez son prénom, sa photo, sa note et ses missions. Vous pouvez l'appeler." },
      { n: '3', heure: h('16 h 05'), titre: 'Vous signez le contrat.', texte: "Contrat d'extra pré-rempli, signé au doigt sur votre téléphone." },
    ],
  },
  app: {
    surtitre: "L'APP KIVIEN",
    titre: 'Dispo le soir ? Dis mi lé la.',
    texte: 'Des soirées payées près de chez toi, quand tu veux. Inscription gratuite.',
    arguments: [
      { titre: 'Tu choisis tes soirées.', texte: 'Coche tes créneaux libres. Tu reçois les missions près de chez toi.' },
      { titre: 'Pas besoin de SIRET.', texte: "Tu signes un contrat d'extra. Tu ne paies jamais rien." },
      { titre: 'Pas de voiture ?', texte: 'Les missions avec retour assuré par le restaurant passent en premier.' },
    ],
    bouton: "Télécharger l'app",
    badge: 'Ce soir',
    ecranTitre: 'Missions',
    mission1Horaire: h('18 h – minuit'),
    mission1Lieu: 'Saint-Gilles · Service en salle',
    mission1Retour: 'Retour assuré par le restaurant',
    mission2Horaire: h('11 h 30 – 15 h'),
    mission2Lieu: 'Saint-Pierre · Commis',
    mission2Retour: h('Dernier bus 20 h 15 : retour à prévoir'),
    boutonEcran: 'Mi lé la',
  },
  contrat: {
    surtitre: 'ZÉRO PAPERASSE',
    titre: 'Le contrat est rédigé pour vous.',
    texte: "Vous embauchez l'extra vous-même, en contrat d'extra. On s'occupe du reste.",
    liste: [
      { titre: "Contrat d'extra pré-rempli", texte: 'Poste, horaires, taux et adresse sont déjà remplis.' },
      { titre: 'Signature au doigt', texte: "Vous et l'extra signez sur téléphone, en une minute." },
      { titre: 'Rappel de la DPAE', texte: "Avec le lien direct vers le site de l'URSSAF." },
      { titre: 'Tout est rangé', texte: 'Contrats et factures téléchargeables dans Mes missions.' },
    ],
    carteTitre: "Contrat d'extra",
    carteType: "CDD d'usage",
    employeur: 'Employeur',
    employeurValeur: 'Le Boucan Grillé',
    salarie: 'Salarié·e',
    salarieValeur: 'Kévin Payet',
    horaires: 'Horaires',
    horairesValeur: h('Sam. 31 oct., 18 h – minuit'),
    taux: 'Taux horaire',
    signature: h('Signé au doigt · 16 h 05'),
  },
  temoignages: {
    surtitre: 'TÉMOIGNAGES',
    titre: "Ils l'ont dit mieux que nous.",
    avertissement: "Citations d'exemple : à remplacer par de vrais témoignages, avec l'accord écrit des personnes.",
    precedent: 'Témoignage précédent',
    suivant: 'Témoignage suivant',
    liste: [
      { prenom: 'Johan', texte: h('Un samedi à 15 h, il me manquait un commis. À 17 h 30, la cuisine était au complet.'), nom: 'Johan', role: 'Chef · restaurant à Saint-Gilles', photo: 'Photo : gérant au travail' },
      { prenom: 'Kévin', texte: 'Je coche mes soirées libres le dimanche. Le reste de la semaine, je fais ce que je veux.', nom: 'Kévin', role: 'Extra · Saint-Paul', photo: 'Photo : extra en salle' },
      { prenom: 'Sandrine', texte: "Le contrat est prêt quand l'extra arrive. Je signe sur mon téléphone, c'est fini.", nom: 'Sandrine', role: 'Responsable · Saint-Pierre', photo: 'Photo : responsable au travail' },
      { prenom: 'Willy', texte: "Deux personnes pour l'animation du week-end, trouvées le vendredi soir.", nom: 'Willy', role: 'Responsable · village vacances, Saint-Gilles', photo: 'Photo : responsable au travail' },
    ],
  },
  garanties: {
    surtitre: 'GARANTIES',
    titre: 'Si ça coince, on gère.',
    liste: [
      { grand: h('2 h'), titre: 'Un extra trouvé vite', texte: h("Entre votre demande et l'extra confirmé, 2 heures maximum.") },
      { grand: 'Remplacé', titre: 'Garantie de remplacement', texte: "Si l'extra se désiste, on cherche tout de suite quelqu'un d'autre." },
      { grand: h('0 €'), titre: 'Non facturé en cas d’absence', texte: "Pas d'extra, pas de remplacement : vous ne payez rien." },
    ],
  },
  tarif: {
    surtitre: 'TARIF',
    parMiseEnRelation: 'par mise en relation',
    nonFacture: "Non facturé si l'extra ne vient pas et n'est pas remplacé.",
    sansEngagement: 'Sans abonnement. Sans engagement.',
    comparaison: 'Environ 20 % moins cher que l’intérim sur une soirée de 6 h.',
    exemple: h('Exemple · 1 extra en salle, samedi 18 h – minuit'),
    salaire: "Salaire de l'extra",
    frais: 'Frais Kivien',
    fraisDetail: "Facturés seulement si l'extra a fait la mission.",
  },
  extras: {
    titreOnglet: 'Devenir extra',
    surtitre: 'MISSIONS D’EXTRA À LA RÉUNION',
    titre: 'Des missions près de chez toi. Tu choisis tes soirées.',
    texte: 'Salle, cuisine, plonge, bar, réception, animation, événements, déménagement. Un vrai contrat à chaque mission, pas besoin de SIRET.',
    bouton: "Je m'inscris",
    sousBouton: 'Gratuit. Une minute pour créer ton profil.',
    lancement: 'Les premiers établissements arrivent dans l’Ouest le mois prochain : inscris-toi, on te prévient en priorité.',
    gainTitre: 'Ce que tu gagnes',
    gainTexte: (net: string, brut: string) => h(`Environ ${net} net pour une soirée de 6 h au SMIC (${brut} brut, congés payés compris).`),
    gainNote: "Payé par l'établissement qui t'embauche, avec un bulletin de paie.",
    metiersTitre: 'Les métiers',
    metiersTexte: "Uniquement des secteurs où le contrat d'extra est permis par la loi.",
    etapesTitre: 'Comment ça marche',
    etapes: [
      { n: '1', titre: 'Tu crées ton profil.', texte: 'Ta commune, tes métiers, ton expérience. Tu coches tes soirées libres.' },
      { n: '2', titre: 'Tu dis mi lé la.', texte: 'Une mission près de chez toi te plaît : un appui et elle est à toi.' },
      { n: '3', titre: 'Tu signes et tu y vas.', texte: 'Le contrat arrive dans l’app, tu signes au doigt. Le jour J, l’établissement t’attend.' },
    ],
    zonesTitre: "Partout sur l'île",
    zonesTexte: 'Nord, Ouest, Sud, Est : tu vois les missions les plus proches de chez toi en premier. Pas de voiture ? Celles avec retour assuré passent en tête.',
    finTitre: 'Ta première mission t’attend.',
  },
  lettre: {
    titre: 'Les nouvelles de Kivien',
    texte: 'Une lettre par mois : nouvelles communes, conseils, changement du SMIC.',
    champ: 'Votre e-mail',
    bouton: "S'inscrire",
    aide: 'Désinscription en un clic.',
    merci: 'Inscription enregistrée. Première lettre le mois prochain.',
    erreurEmail: 'Indiquez une adresse e-mail valide.',
    erreurReseau: 'Inscription impossible pour le moment. Réessayez dans un instant.',
  },
  pied: {
    signature: 'Les extras péi, en 2 heures.',
    colonnes: [
      { titre: 'Restaurateurs', liens: ['Trouver un extra', 'Tarif', "Le contrat d'extra", 'Se connecter'] },
      { titre: 'Extras', liens: ['Devenir extra', 'Missions près de chez moi', 'Mes droits'] },
      { titre: 'Aide', liens: ['Questions fréquentes', 'Nous écrire', 'bonjour@kivien.re'] },
      { titre: "Télécharger l'app", liens: ['Android', 'iPhone'] },
    ],
    copyright: '© Kivien 2026 · Saint-Denis · Saint-Paul · Saint-Pierre · Le Tampon',
    legal: ['Mentions légales', 'CGV', 'Confidentialité', 'Cookies'],
  },
} as const;

/** Exemple de la maquette : une soirée de 6 h (18 h – minuit), calculée avec le taux en vigueur. */
export const MINUTES_EXEMPLE_VITRINE = 360;

/** Montants affichés sur la page d'accueil, tous dérivés des paramètres en vigueur. */
export function montantsVitrine(tauxHoraireBrutCentimes: number, fraisHTCentimes: number) {
  const brut = brutParExtraCentimes(MINUTES_EXEMPLE_VITRINE, tauxHoraireBrutCentimes);
  const taux = formatEuros(tauxHoraireBrutCentimes);
  const heures = MINUTES_EXEMPLE_VITRINE / 60;
  const cp = `+ ${CONGES_PAYES_POURCENT}${NBSP}% de congés payés`;
  return {
    taux,
    brut: formatEuros(brut),
    net: `${netEstimeEuros(brut)}${NBSP}€`,
    fraisCourt: formatHT(fraisHTCentimes),
    /** Chiffre du haut de page : « HT » peut passer à la ligne sur mobile (colonne étroite). */
    fraisChiffre: formatHT(fraisHTCentimes).replace(`${NBSP}HT`, ' HT'),
    fraisDetail: `${formatEuros(fraisHTCentimes)}${NBSP}HT`,
    noteApp: `Montant calculé sur ${taux} brut/h (SMIC, revu chaque 1er janvier), ${cp}.`,
    noteTarif: `Taux minimum légal en vigueur : ${taux} brut/h (SMIC, revu chaque 1er janvier).`,
    detailSalaire: `${heures}${NBSP}h × ${taux} ${cp}. Versé par vous, hors charges patronales.`,
    tauxCarte: `${taux} brut`,
  };
}
