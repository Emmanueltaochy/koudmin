import { COMMUNES_REUNION } from './communes';

/**
 * Zones de l'île, d'après les intercommunalités : Nord (CINOR), Est (CIREST), Ouest (TCO),
 * Sud (CIVIS et CASUD). Sert au recrutement des extras et au démarchage, zone par zone.
 */
export const ZONES = ['nord', 'ouest', 'sud', 'est'] as const;
export type Zone = (typeof ZONES)[number];

export const LIBELLES_ZONE: Record<Zone, string> = { nord: 'Nord', ouest: 'Ouest', sud: 'Sud', est: 'Est' };

/** « dans le Nord », « dans l'Ouest »… */
export const DANS_ZONE: Record<Zone, string> = { nord: 'dans le Nord', ouest: "dans l'Ouest", sud: 'dans le Sud', est: "dans l'Est" };

const ZONE_COMMUNE: Record<(typeof COMMUNES_REUNION)[number]['nom'], Zone> = {
  'Saint-Denis': 'nord',
  'Sainte-Marie': 'nord',
  'Sainte-Suzanne': 'nord',
  'Le Port': 'ouest',
  'La Possession': 'ouest',
  'Saint-Paul': 'ouest',
  'Les Trois-Bassins': 'ouest',
  'Saint-Leu': 'ouest',
  'Les Avirons': 'sud',
  "L'Étang-Salé": 'sud',
  'Saint-Louis': 'sud',
  'Cilaos': 'sud',
  "L'Entre-Deux": 'sud',
  'Saint-Pierre': 'sud',
  'Le Tampon': 'sud',
  'Petite-Île': 'sud',
  'Saint-Joseph': 'sud',
  'Saint-Philippe': 'sud',
  'Saint-André': 'est',
  'Bras-Panon': 'est',
  'Saint-Benoît': 'est',
  'La Plaine-des-Palmistes': 'est',
  'Sainte-Rose': 'est',
  'Salazie': 'est',
};

/**
 * Zone d'un lieu : par le nom de sa commune, sinon (localité comme Saint-Gilles-les-Bains)
 * par la commune la plus proche de ses coordonnées.
 */
export function zoneDuLieu(commune: string | null, lat?: number | null, lng?: number | null): Zone | null {
  const parNom = commune ? zoneDeCommune(commune) : null;
  if (parNom || lat == null || lng == null) return parNom;
  let proche: (typeof COMMUNES_REUNION)[number] | null = null;
  let meilleure = Infinity;
  for (const c of COMMUNES_REUNION) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < meilleure) {
      meilleure = d;
      proche = c;
    }
  }
  return proche ? zoneDeCommune(proche.nom) : null;
}

/** Zone d'une commune de La Réunion, null si la commune est inconnue. */
export function zoneDeCommune(commune: string): Zone | null {
  return (ZONE_COMMUNE as Record<string, Zone>)[commune] ?? null;
}
