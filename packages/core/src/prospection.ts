/**
 * Prospection : établissements de La Réunion trouvés dans OpenStreetMap (données ouvertes, licence
 * ODbL, « © les contributeurs d'OpenStreetMap ») par le VPS, puis suivis dans l'espace admin.
 */

export const CATEGORIES_PROSPECT = ['restaurant', 'bar', 'cafe', 'restauration_rapide', 'hotel', 'hebergement', 'nuit', 'autre'] as const;
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

export const STATUTS_PROSPECT = ['a_contacter', 'contacte', 'interesse', 'inscrit', 'pas_interesse'] as const;
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
export function modeleCampagne(fraisHT: string): { sujet: string; message: string } {
  return {
    sujet: "Kivien : vos extras à La Réunion, sans passer par l'intérim",
    message: [
      'Bonjour,',
      "Kivien, la nouvelle plateforme réunionnaise pour trouver des extras, ouvre dans quelques jours.",
      "Un service chargé, une absence de dernière minute : vous publiez votre besoin et les extras disponibles près de {commune} sont prévenus tout de suite. Notre objectif : un extra trouvé en 2 heures.",
      [
        "- Contrat d'extra (CDD d'usage) rédigé pour vous, signé en ligne",
        `- ${fraisHT} HT par mise en relation, environ 20 % moins cher que l'intérim`,
        "- Rien à payer en cas d'absence de l'extra",
      ].join('\n'),
      'Créez votre compte dès maintenant sur https://kivien.re : il sera prêt le jour du lancement.',
      'Une question ? Répondez simplement à ce message.',
      "L'équipe Kivien",
    ].join('\n\n'),
  };
}
