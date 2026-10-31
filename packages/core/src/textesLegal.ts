/**
 * Pages légales et pages d'information de kivien.re : mentions légales, conditions générales,
 * confidentialité, cookies, questions fréquentes, qui sommes-nous.
 * Rédaction de départ, à faire relire par un juriste avant l'ouverture.
 * Les montants ne sont jamais écrits ici : ils viennent de la table `parametres` (page /pro).
 */

/** Version des conditions générales : changée à chaque modification, acceptée de nouveau ensuite. */
export const VERSION_CGU = '2026-11-01';

export interface SectionLegale {
  titre: string;
  paragraphes: string[];
}

export interface PageLegale {
  titre: string;
  intro: string;
  miseAJour: string;
  sections: SectionLegale[];
}

const EDITEUR =
  'Emmanuel TAOCHY, entrepreneur individuel (EI), exerçant sous le nom commercial Kivien';
const ADRESSE = "124 route des Canots, 97427 L'Étang-Salé, La Réunion";
const CONTACT = 'bonjour@kivien.re';

export const mentionsLegales: PageLegale = {
  titre: 'Mentions légales',
  intro: 'Informations sur l’éditeur et l’hébergeur du site kivien.re et de l’application Kivien.',
  miseAJour: 'Mise à jour le 1er novembre 2026.',
  sections: [
    {
      titre: 'Éditeur',
      paragraphes: [
        EDITEUR + '.',
        `Adresse : ${ADRESSE}.`,
        'SIRET : 884 270 604 00025. TVA intracommunautaire : FR49884270604.',
        `Contact : ${CONTACT}.`,
        'Directeur de la publication : Emmanuel TAOCHY.',
      ],
    },
    {
      titre: 'Hébergement',
      paragraphes: [
        'Le site, l’application et leurs données sont hébergés sur un serveur loué à Hostinger International Ltd., 61 Lordou Vironos Street, 6023 Larnaca, Chypre (hostinger.fr).',
      ],
    },
    {
      titre: 'Propriété intellectuelle',
      paragraphes: [
        'Le nom Kivien, le logo, les textes et la présentation du site sont la propriété de l’éditeur. Toute reproduction sans autorisation écrite est interdite.',
        'Les données d’établissements utilisées pour la prospection proviennent en partie d’OpenStreetMap, © les contributeurs d’OpenStreetMap, sous licence ODbL.',
      ],
    },
  ],
};

export const conditionsGenerales: PageLegale = {
  titre: 'Conditions générales d’utilisation et de vente',
  intro:
    'Ces conditions s’appliquent à toute personne qui utilise Kivien : les établissements qui cherchent du renfort et les extras qui cherchent des missions. Elles sont acceptées à la création du compte.',
  miseAJour: `Version du ${VERSION_CGU.split('-').reverse().join('/')}.`,
  sections: [
    {
      titre: '1. Le service',
      paragraphes: [
        'Kivien est une plateforme de mise en relation entre des établissements (restaurants, hôtels, bars, traiteurs, organisateurs d’événements, structures de loisirs…) et des personnes disponibles pour des missions courtes, appelées extras.',
        'Kivien n’est ni l’employeur des extras, ni une entreprise de travail temporaire. L’établissement embauche directement l’extra, en contrat à durée déterminée d’usage (CDD d’usage), et reste seul employeur.',
      ],
    },
    {
      titre: '2. Comptes',
      paragraphes: [
        'La création d’un compte demande des informations exactes : numéro de mobile, adresse e-mail, et pour un établissement son numéro SIRET et son adresse. Chacun garde son mot de passe secret et reste responsable de l’usage de son compte.',
        'Un établissement peut donner accès à son compte à d’autres personnes de son équipe ; il reste responsable de leurs actions.',
      ],
    },
    {
      titre: '3. Engagements de l’établissement',
      paragraphes: [
        'L’établissement publie des demandes réelles, pour des emplois de son secteur d’activité où le recours au CDD d’usage est permis (article D1242-1 du Code du travail), avec un taux horaire au moins égal au minimum légal.',
        'Il signe le contrat d’extra, effectue la déclaration préalable à l’embauche (DPAE) auprès de l’URSSAF avant le début de la mission tant que Kivien ne la transmet pas pour lui, verse le salaire, établit le bulletin de paie et respecte le droit du travail (durées de travail, repos, sécurité, égalité de traitement).',
        'Il signale sans délai l’absence d’un extra depuis son espace (notation de la mission).',
      ],
    },
    {
      titre: '4. Engagements de l’extra',
      paragraphes: [
        'L’extra renseigne un profil exact (identité, métiers, expérience) et n’accepte que des missions qu’il ou elle peut assurer.',
        'Une mission acceptée engage : en cas d’empêchement, l’extra se désiste depuis l’application au moins 4 heures avant le début. Une absence sans prévenir peut entraîner la fermeture du compte.',
        'L’extra signe son contrat avant la mission et fournit les informations nécessaires à la DPAE et au bulletin de paie.',
      ],
    },
    {
      titre: '5. Prix et paiement',
      paragraphes: [
        'L’inscription et l’utilisation sont gratuites pour les extras : un extra ne paie jamais rien à Kivien.',
        'L’établissement paie des frais de mise en relation par extra et par mission, au tarif en vigueur affiché sur kivien.re/pro au moment de la publication de la demande, plus la TVA applicable à La Réunion. Aucun frais n’est dû en cas d’absence de l’extra signalée par l’établissement.',
        'Les frais sont réglés par carte bancaire ou par prélèvement SEPA, après chaque mission ou par facture mensuelle, selon le mode choisi par l’établissement dans son espace. Un paiement refusé peut être relancé ; en cas d’impayé, l’accès aux nouvelles demandes peut être suspendu. Tout retard de paiement entraîne des pénalités au taux légal et une indemnité forfaitaire de 40 € pour frais de recouvrement.',
        'Le salaire de l’extra est versé directement par l’établissement et ne transite pas par Kivien.',
      ],
    },
    {
      titre: '6. Remplacement',
      paragraphes: [
        'Si un extra se désiste, la demande est de nouveau proposée aux extras disponibles. Kivien ne garantit pas de trouver un extra pour chaque demande ; le délai de 2 heures présenté sur le site est un objectif, pas un engagement.',
      ],
    },
    {
      titre: '7. Responsabilité',
      paragraphes: [
        'Kivien met tout en œuvre pour assurer le bon fonctionnement du service, sans pouvoir garantir une disponibilité permanente. Kivien n’est pas partie au contrat de travail et ne répond pas de son exécution, ni du comportement des établissements ou des extras.',
        'Les contrats d’extra proposés par Kivien sont des modèles remplis à partir des informations saisies : l’établissement vérifie leur contenu avant de signer.',
      ],
    },
    {
      titre: '8. Suspension et fermeture du compte',
      paragraphes: [
        'Chacun peut fermer son compte à tout moment en écrivant à bonjour@kivien.re. Kivien peut suspendre ou fermer un compte en cas de manquement à ces conditions, de fausse information ou de comportement abusif.',
      ],
    },
    {
      titre: '9. Données personnelles',
      paragraphes: [
        'Le traitement des données est décrit dans la politique de confidentialité (kivien.re/confidentialite).',
      ],
    },
    {
      titre: '10. Droit applicable et litiges',
      paragraphes: [
        'Ces conditions sont soumises au droit français. En cas de désaccord, une solution amiable est recherchée en premier lieu à bonjour@kivien.re. À défaut, les tribunaux de Saint-Denis de La Réunion sont compétents.',
        'Les conditions peuvent évoluer ; la nouvelle version est présentée à la connexion suivante et doit être acceptée pour continuer à utiliser le service.',
      ],
    },
  ],
};

export const confidentialite: PageLegale = {
  titre: 'Politique de confidentialité',
  intro:
    'Quelles données Kivien utilise, pourquoi, combien de temps, et comment exercer vos droits.',
  miseAJour: 'Mise à jour le 1er novembre 2026.',
  sections: [
    {
      titre: 'Responsable du traitement',
      paragraphes: [`${EDITEUR}, ${ADRESSE}. Contact : ${CONTACT}.`],
    },
    {
      titre: 'Données des extras',
      paragraphes: [
        'Prénom, nom, mobile, adresse e-mail, commune et position approximative (pour proposer les missions proches), métiers, expérience, langues, présentation, photo facultative, disponibilités.',
        'Pour le contrat et la DPAE : date et lieu de naissance, adresse, numéro de sécurité sociale (facultatif), signature. Ces informations ne sont transmises qu’à l’établissement de la mission acceptée.',
      ],
    },
    {
      titre: 'Données des établissements',
      paragraphes: [
        'Nom, SIRET, secteur, adresse, téléphone, adresse e-mail, membres de l’équipe, demandes publiées, signatures, notations des missions, factures et paiements. Les numéros de carte et les IBAN sont saisis chez Stripe et GoCardless : Kivien ne les voit jamais.',
      ],
    },
    {
      titre: 'Pourquoi',
      paragraphes: [
        'Exécuter le service (mise en relation, contrats, factures, paiements) : base légale, le contrat.',
        'Respecter nos obligations comptables et fiscales : base légale, l’obligation légale.',
        'Présenter Kivien aux établissements de l’île par e-mail (coordonnées professionnelles publiques, lien de désinscription dans chaque message, mesure des clics sur nos liens) : base légale, l’intérêt légitime.',
      ],
    },
    {
      titre: 'Destinataires',
      paragraphes: [
        'L’établissement et l’extra d’une même mission voient les informations nécessaires à cette mission. Prestataires techniques : Hostinger (hébergement, envoi des e-mails), Stripe (paiement par carte), GoCardless (prélèvement SEPA). Aucune donnée n’est vendue.',
      ],
    },
    {
      titre: 'Durées de conservation',
      paragraphes: [
        'Comptes : tant qu’ils sont actifs, puis trois ans sans connexion avant suppression.',
        'Contrats et données de mission : cinq ans après la mission. Factures et pièces comptables : dix ans.',
        'Fiches de prospection : trois ans après le dernier contact ; une demande de désinscription est conservée pour être respectée.',
      ],
    },
    {
      titre: 'Vos droits',
      paragraphes: [
        'Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur portabilité, ou vous opposer à leur usage, en écrivant à bonjour@kivien.re. Réponse sous un mois.',
        'Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).',
      ],
    },
  ],
};

export const cookies: PageLegale = {
  titre: 'Cookies et stockage',
  intro: 'Kivien n’utilise ni publicité ni outil de mesure d’audience tiers.',
  miseAJour: 'Mise à jour le 1er novembre 2026.',
  sections: [
    {
      titre: 'Ce qui est enregistré dans votre navigateur',
      paragraphes: [
        'Votre session et l’établissement que vous avez choisi, pour garder votre espace ouvert : indispensables au service.',
        'Si vous arrivez sur kivien.re depuis un de nos e-mails de présentation, un identifiant de ce message est gardé 30 jours pour savoir si Kivien vous intéresse (pages vues, création de compte). Vous pouvez le refuser en vidant les données du site dans votre navigateur ou en vous désinscrivant depuis le lien de l’e-mail.',
      ],
    },
  ],
};

export interface Question {
  question: string;
  reponse: string;
}

export const questionsFrequentes: { titre: string; surtitre: string; questions: Question[] } = {
  surtitre: 'QUESTIONS FRÉQUENTES',
  titre: 'Vous vous demandez peut-être…',
  questions: [
    {
      question: 'Qui est l’employeur de l’extra ?',
      reponse:
        'L’établissement. Il embauche l’extra en contrat d’extra (CDD d’usage), le paie et lui remet son bulletin de paie. Kivien trouve la personne et prépare le contrat, sans être employeur ni agence d’intérim.',
    },
    {
      question: 'Est-ce légal ?',
      reponse:
        'Oui. Le CDD d’usage est prévu par le Code du travail pour certains secteurs, dont l’hôtellerie-restauration, l’événementiel et les loisirs. Kivien ne propose que les métiers de ces secteurs.',
    },
    {
      question: 'Que se passe-t-il si l’extra ne vient pas ?',
      reponse:
        'Vous le signalez depuis votre espace : la mise en relation n’est pas facturée. Si l’extra se désiste à l’avance, la demande est de nouveau proposée aux extras disponibles.',
    },
    {
      question: 'Combien ça coûte ?',
      reponse:
        'Pour l’établissement, des frais fixes par mise en relation, affichés sur la page Tarif, environ 20 % moins cher que l’intérim sur une soirée. Pour l’extra, rien : Kivien est gratuit.',
    },
    {
      question: 'Et la DPAE ?',
      reponse:
        'Pour l’instant, l’établissement la fait lui-même sur net-entreprises.fr, avec les informations affichées dans son espace. L’envoi automatique par Kivien arrive bientôt.',
    },
    {
      question: 'Comment l’extra est-il payé ?',
      reponse:
        'Directement par l’établissement, avec un bulletin de paie, au taux affiché sur la mission (jamais sous le minimum légal), congés payés en plus.',
    },
    {
      question: 'Faut-il un SIRET ou un statut pour être extra ?',
      reponse:
        'Non. L’extra est salarié de l’établissement pour la durée de la mission : pas d’auto-entreprise, pas de facture.',
    },
    {
      question: 'Dans quelles communes ?',
      reponse:
        'Partout à La Réunion : Nord, Ouest, Sud et Est. Les missions et les extras les plus proches sont proposés en premier.',
    },
  ],
};

export const aPropos: {
  titre: string;
  intro: string;
  sections: SectionLegale[];
  contact: string;
  signature: string;
} = {
  titre: 'Qui sommes-nous',
  intro:
    'Kivien est né à L’Étang-Salé, d’un constat simple : à La Réunion, trouver un extra au dernier moment relève trop souvent du bouche-à-oreille et des groupes de messagerie.',
  sections: [
    {
      titre: 'Pourquoi Kivien',
      paragraphes: [
        'Les restaurants, hôtels et bars de l’île vivent au rythme des saisons, des mariages et des week-ends chargés. Un service sans renfort, c’est une équipe épuisée et des clients qui attendent. De l’autre côté, beaucoup de personnes cherchent quelques soirées de travail, près de chez elles, avec un vrai contrat.',
        'Kivien relie les deux, simplement : l’établissement publie son besoin, les extras proches reçoivent l’alerte, le contrat se signe en ligne.',
      ],
    },
    {
      titre: 'Pensé pour La Réunion',
      paragraphes: [
        'Les distances, les bus du soir, le Nord, le Sud, l’Est et l’Ouest : Kivien propose d’abord ce qui est proche, et met en avant le retour assuré pour qui n’a pas de voiture.',
      ],
    },
    {
      titre: 'Nos engagements',
      paragraphes: [
        'Un vrai contrat et une fiche de paie pour chaque mission. Un prix clair pour les établissements, rien à payer pour les extras. Des données utilisées seulement pour le service, jamais vendues.',
      ],
    },
  ],
  contact: 'Une question, une idée, un partenariat : bonjour@kivien.re.',
  signature: 'Emmanuel TAOCHY, fondateur de Kivien',
};

/** Acceptation demandée à la création d'un compte. */
export const textesAcceptation = {
  resto: 'J’accepte les conditions générales et la politique de confidentialité de Kivien.',
  extra: 'J’accepte les conditions générales et la politique de confidentialité de Kivien.',
  erreur: 'Cochez la case pour accepter les conditions générales.',
  erreurExtra: 'Coche la case pour accepter les conditions générales.',
  lienConditions: 'Lire les conditions générales',
  lienConfidentialite: 'la politique de confidentialité',
} as const;
