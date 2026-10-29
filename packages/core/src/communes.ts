/**
 * Les 24 communes de La Réunion, avec un point de référence (centre-bourg, approximatif).
 * Sert à situer l'extra à l'inscription : la distance aux missions est calculée depuis ce point.
 */
export const COMMUNES_REUNION = [
  { nom: 'Bras-Panon', lat: -21.0017, lng: 55.6775 },
  { nom: 'Cilaos', lat: -21.1342, lng: 55.4719 },
  { nom: "L'Entre-Deux", lat: -21.2489, lng: 55.4717 },
  { nom: "L'Étang-Salé", lat: -21.265, lng: 55.3667 },
  { nom: 'La Plaine-des-Palmistes', lat: -21.1336, lng: 55.6283 },
  { nom: 'La Possession', lat: -20.925, lng: 55.3358 },
  { nom: 'Le Port', lat: -20.9372, lng: 55.2919 },
  { nom: 'Le Tampon', lat: -21.2781, lng: 55.5153 },
  { nom: 'Les Avirons', lat: -21.2408, lng: 55.3394 },
  { nom: 'Les Trois-Bassins', lat: -21.1031, lng: 55.2961 },
  { nom: 'Petite-Île', lat: -21.3531, lng: 55.5636 },
  { nom: 'Saint-André', lat: -20.9631, lng: 55.6503 },
  { nom: 'Saint-Benoît', lat: -21.0339, lng: 55.7128 },
  { nom: 'Saint-Denis', lat: -20.8823, lng: 55.4504 },
  { nom: 'Saint-Joseph', lat: -21.3778, lng: 55.6194 },
  { nom: 'Saint-Leu', lat: -21.1706, lng: 55.2886 },
  { nom: 'Saint-Louis', lat: -21.2861, lng: 55.4114 },
  { nom: 'Saint-Paul', lat: -21.0096, lng: 55.2707 },
  { nom: 'Saint-Philippe', lat: -21.3586, lng: 55.7672 },
  { nom: 'Saint-Pierre', lat: -21.3393, lng: 55.4781 },
  { nom: 'Sainte-Marie', lat: -20.8969, lng: 55.5492 },
  { nom: 'Sainte-Rose', lat: -21.1275, lng: 55.7958 },
  { nom: 'Sainte-Suzanne', lat: -20.9067, lng: 55.6067 },
  { nom: 'Salazie', lat: -21.0275, lng: 55.5394 },
] as const;

export type CommuneReunion = (typeof COMMUNES_REUNION)[number]['nom'];

export function trouverCommune(nom: string) {
  return COMMUNES_REUNION.find((c) => c.nom === nom) ?? null;
}
