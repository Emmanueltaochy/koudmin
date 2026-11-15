/**
 * Prospection : établissements de La Réunion trouvés dans OpenStreetMap (données ouvertes, licence
 * ODbL, « © les contributeurs d'OpenStreetMap ») par le VPS, puis suivis dans l'espace admin.
 */

export const CATEGORIES_PROSPECT = [
  'restaurant',
  'bar',
  'cafe',
  'restauration_rapide',
  'hotel',
  'hebergement',
  'nuit',
  'autre',
] as const;
export type CategorieProspect = (typeof CATEGORIES_PROSPECT)[number];

export const LIBELLES_CATEGORIE_PROSPECT: Record<CategorieProspect, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  cafe: 'Café, glacier',
  restauration_rapide: 'Restauration rapide',
  hotel: 'Hôtel',
  hebergement: 'Gîte, chambres, camping',
  nuit: 'Discothèque',
  autre: 'Autre',
};

export const STATUTS_PROSPECT = [
  'a_contacter',
  'contacte',
  'interesse',
  'inscrit',
  'pas_interesse',
] as const;
export type StatutProspect = (typeof STATUTS_PROSPECT)[number];

/** Fiche importée (même forme que la recherche du VPS, deploy/vps/recherche-prospects.sh). */
export interface ProspectOsm {
  osm_id: string;
  nom: string;
  categorie: CategorieProspect;
  commune: string | null;
  adresse: string | null;
  lat: number | null;
  lng: number | null;
  telephone: string | null;
  email: string | null;
  site: string | null;
}

export type StatutRecherche = 'demandee' | 'en_cours' | 'terminee' | 'echouee';

/** Message de lancement proposé dans l'espace admin. {nom} et {commune} sont remplacés à l'envoi. */
export function modeleCampagne(fraisHoraireHT: string): { sujet: string; message: string } {
  return {
    sujet: "Kivien : vos extras à La Réunion, sans passer par l'intérim",
    message: [
      'Bonjour,',
      'Kivien, la nouvelle plateforme réunionnaise pour trouver des extras, ouvre très bientôt.',
      'Un service chargé, une absence de dernière minute : vous publiez votre besoin et les extras disponibles près de {commune} sont prévenus tout de suite. Notre objectif : un extra trouvé en 2 heures.',
      [
        "- Contrat d'extra (CDD d'usage) rédigé pour vous, signé en ligne",
        `- ${fraisHoraireHT} HT par heure d'extra, environ 20 % moins cher que l'intérim`,
        "- Rien à payer en cas d'absence de l'extra",
      ].join('\n'),
      'Créez votre compte dès maintenant sur https://kivien.re : il sera prêt le jour du lancement.',
      'Une question ? Répondez simplement à ce message.',
      "L'équipe Kivien",
    ].join('\n\n'),
  };
}

/** Relance, une seule fois, aux établissements qui n'ont pas cliqué. {nom} et {commune} remplacés à l'envoi. */
export function modeleRelance(fraisHoraireHT: string): { sujet: string; message: string } {
  return {
    sujet: 'Kivien : des extras près de {commune}, quand vous en avez besoin',
    message: [
      'Bonjour,',
      'Je me permets de revenir vers vous : Kivien, la plateforme réunionnaise pour trouver des extras, ouvre très bientôt près de {commune}.',
      `Vous publiez votre besoin, un extra proche accepte, le contrat d'extra est prêt à signer en ligne. ${fraisHoraireHT} HT par heure d'extra, rien en cas d'absence.`,
      'Créer votre compte prend deux minutes sur https://kivien.re',
      'Une question ? Répondez simplement à ce message.',
      "L'équipe Kivien",
    ].join('\n\n'),
  };
}

export const textesProspectionAuto = {
  titre: 'Prospection automatique',
  aide: 'Chaque jour de semaine, les établissements des zones choisies reçoivent le message de lancement, dans la limite de 40 e-mails par jour. Jamais pour une adresse désinscrite, un établissement inscrit ou « pas intéressé ».',
  activer: 'Activer la prospection automatique',
  desactivee: 'Désactivée : aucun e-mail ne part tout seul.',
  activee: 'Activée : les e-mails partent chaque jour de semaine, de 8 h à 18 h.',
  zones: 'Zones',
  zonesAide: 'Commencez par la zone où vous avez des extras.',
  lancement: 'Premier e-mail',
  relance: 'Relancer une fois ceux qui n’ont pas cliqué',
  relanceApres: 'Relance après (jours)',
  sujet: 'Sujet',
  message: 'Message',
  apercu: (aLancer: number, aRelancer: number) =>
    `Aujourd'hui : ${aLancer} établissement${aLancer > 1 ? 's' : ''} à contacter, ${aRelancer} relance${aRelancer > 1 ? 's' : ''} possible${aRelancer > 1 ? 's' : ''}.`,
  enregistrer: 'Enregistrer les réglages',
  enregistre: 'Réglages enregistrés.',
  erreur: 'Réglages non enregistrés. Vérifiez le sujet et le message, puis réessayez.',
  erreurZone: 'Choisissez au moins une zone.',
  automatique: 'Automatique',
} as const;
