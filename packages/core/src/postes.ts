/** Métiers proposés, regroupés par secteur dans secteurs.ts. Même liste que l'enum SQL `poste`. */
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
export type Poste = (typeof POSTES)[number];

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
};
