/** Métiers proposés, regroupés par secteur dans secteurs.ts. Même liste que l'enum SQL `poste` (plus `autre`). */
export const POSTES = [
  'serveur',
  'barman',
  'cuisine',
  'commis',
  'plonge',
  'reception',
  'etages',
  'animation',
  'technique_spectacle',
  'montage_spectacle',
  'accueil_spectacle',
  'demenagement',
  'enquete',
  'fete_foraine',
  'entrepot_viande',
  'reparation_navale',
  'travaux_forestiers',
  'formation',
] as const;
/**
 * `autre` : poste écrit par l'établissement (intitulé obligatoire, description facultative).
 * Ouvert dans tous les secteurs, jamais proposé comme compétence d'un extra.
 */
export const POSTE_LIBRE = 'autre';
export type Poste = (typeof POSTES)[number] | typeof POSTE_LIBRE;
export const INTITULE_MAX = 60;
export const DESCRIPTION_POSTE_MAX = 500;

/**
 * Libellés épicènes. `court` : chips du formulaire de demande.
 * `mission` : cartes et détail côté extra (offre publique).
 */
export const LIBELLES_POSTE: Record<Poste, { court: string; mission: string }> = {
  serveur: { court: 'Salle', mission: 'Service en salle' },
  barman: { court: 'Bar', mission: 'Service au bar' },
  cuisine: { court: 'Cuisine', mission: 'Cuisine' },
  commis: { court: 'Commis', mission: 'Commis de cuisine' },
  plonge: { court: 'Plonge', mission: 'Plonge' },
  reception: { court: 'Réception', mission: 'Réception' },
  etages: { court: 'Étages', mission: 'Entretien des chambres' },
  animation: { court: 'Animation', mission: 'Animation' },
  technique_spectacle: { court: 'Technique', mission: 'Technique son et lumière' },
  montage_spectacle: { court: 'Montage', mission: 'Montage et démontage de scène' },
  accueil_spectacle: { court: 'Accueil du public', mission: 'Accueil du public et billetterie' },
  demenagement: { court: 'Déménagement', mission: 'Manutention de déménagement' },
  enquete: { court: 'Enquête', mission: 'Enquête et sondage de terrain' },
  fete_foraine: { court: 'Fête foraine', mission: 'Tenue de stand ou de manège forain' },
  entrepot_viande: { court: 'Entrepôt froid', mission: 'Manutention en entrepôt de viande' },
  reparation_navale: { court: 'Réparation navale', mission: 'Aide en réparation navale' },
  travaux_forestiers: { court: 'Travaux forestiers', mission: 'Travaux forestiers' },
  formation: { court: 'Formation', mission: 'Intervention de formation' },
  autre: { court: 'Autre poste', mission: 'Mission' },
};

/** Nom du poste à afficher : l'intitulé écrit par l'établissement pour un poste libre. */
export function libellePoste(poste: Poste, intitule?: string | null, forme: 'court' | 'mission' = 'mission'): string {
  return poste === POSTE_LIBRE && intitule?.trim() ? intitule.trim() : LIBELLES_POSTE[poste][forme];
}

/** Famille d'un métier, pour sa vignette (couleur et icône) dans les deux apps. */
export type FamillePoste = 'salle' | 'cuisine' | 'hebergement' | 'animation' | 'technique' | 'manutention' | 'terrain';

export const FAMILLE_POSTE: Record<Poste, FamillePoste> = {
  serveur: 'salle',
  barman: 'salle',
  reception: 'hebergement',
  etages: 'hebergement',
  cuisine: 'cuisine',
  commis: 'cuisine',
  plonge: 'cuisine',
  animation: 'animation',
  fete_foraine: 'animation',
  accueil_spectacle: 'animation',
  technique_spectacle: 'technique',
  montage_spectacle: 'technique',
  reparation_navale: 'technique',
  demenagement: 'manutention',
  entrepot_viande: 'manutention',
  travaux_forestiers: 'terrain',
  enquete: 'terrain',
  formation: 'terrain',
  autre: 'terrain',
};
