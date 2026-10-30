/**
 * Prospection : établissements de La Réunion trouvés dans OpenStreetMap (données ouvertes, licence
 * ODbL, « © les contributeurs d'OpenStreetMap »), convertis en fiches pour l'espace admin.
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

/** Cadre de l'île (sud, ouest, nord, est) : plus léger qu'une recherche par limite administrative. */
const CADRE_REUNION = '-21.40,55.20,-20.85,55.85';

/**
 * Requêtes Overpass, en deux parts pour rester légères : restauration et bars, puis hébergements.
 * Seuls les lieux nommés sont retenus.
 */
export const REQUETES_OVERPASS = [
  `[out:json][timeout:90][bbox:${CADRE_REUNION}];
nwr["amenity"~"^(restaurant|bar|pub|biergarten|cafe|ice_cream|fast_food|food_court|nightclub)$"]["name"];
out tags center;`,
  `[out:json][timeout:90][bbox:${CADRE_REUNION}];
nwr["tourism"~"^(hotel|resort|motel|guest_house|hostel|camp_site|chalet|apartment)$"]["name"];
out tags center;`,
];

/** Serveurs Overpass publics, essayés dans l'ordre quand l'un est saturé. */
export const SERVEURS_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const PAR_AMENITY: Record<string, CategorieProspect> = {
  restaurant: 'restaurant',
  bar: 'bar',
  pub: 'bar',
  biergarten: 'bar',
  cafe: 'cafe',
  ice_cream: 'cafe',
  fast_food: 'restauration_rapide',
  food_court: 'restauration_rapide',
  nightclub: 'nuit',
};
const PAR_TOURISM: Record<string, CategorieProspect> = {
  hotel: 'hotel',
  resort: 'hotel',
  motel: 'hotel',
  guest_house: 'hebergement',
  hostel: 'hebergement',
  camp_site: 'hebergement',
  chalet: 'hebergement',
  apartment: 'hebergement',
};

export interface ElementOsm {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Ligne envoyée à l'import (admin_importer_prospects). */
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

const premier = (t: Record<string, string>, ...cles: string[]) => {
  for (const c of cles) {
    // « 0262 11 22 33;0692 … » : la première valeur suffit.
    const v = t[c]?.split(';')[0]?.trim();
    if (v) return v;
  }
  return null;
};

export function prospectDepuisOsm(e: ElementOsm): ProspectOsm | null {
  const t = e.tags ?? {};
  const nom = t.name?.trim();
  if (!nom) return null;
  const categorie = PAR_AMENITY[t.amenity ?? ''] ?? PAR_TOURISM[t.tourism ?? ''] ?? 'autre';
  const rue = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  return {
    osm_id: `${e.type}/${e.id}`,
    nom,
    categorie,
    commune: premier(t, 'addr:city', 'addr:municipality'),
    adresse: rue || premier(t, 'addr:full'),
    lat: e.lat ?? e.center?.lat ?? null,
    lng: e.lon ?? e.center?.lon ?? null,
    telephone: premier(t, 'phone', 'contact:phone', 'contact:mobile', 'mobile'),
    email: premier(t, 'email', 'contact:email')?.toLowerCase() ?? null,
    site: premier(t, 'website', 'contact:website', 'url'),
  };
}

/** Réponse Overpass → fiches, sans doublon. */
export function prospectsDepuisOverpass(reponse: { elements?: ElementOsm[] }): ProspectOsm[] {
  const vus = new Set<string>();
  const fiches: ProspectOsm[] = [];
  for (const e of reponse.elements ?? []) {
    const p = prospectDepuisOsm(e);
    if (!p || vus.has(p.osm_id)) continue;
    vus.add(p.osm_id);
    fiches.push(p);
  }
  return fiches;
}

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
