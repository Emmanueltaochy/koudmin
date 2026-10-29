export const POSTES = ['serveur', 'plonge', 'commis', 'barman', 'reception'] as const;
export type Poste = (typeof POSTES)[number];

/**
 * Libellés épicènes. `court` : chips du formulaire restaurateur.
 * `mission` : cartes et détail côté extra (offre publique).
 */
export const LIBELLES_POSTE: Record<Poste, { court: string; mission: string }> = {
  serveur: { court: 'Salle', mission: 'Service en salle' },
  plonge: { court: 'Plonge', mission: 'Plonge' },
  commis: { court: 'Commis', mission: 'Commis de cuisine' },
  barman: { court: 'Bar', mission: 'Service au bar' },
  reception: { court: 'Réception', mission: 'Réception' },
};
