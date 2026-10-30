import type { Poste } from './postes';

/**
 * Secteurs où le contrat d'extra (CDD d'usage) est permis : article D1242-1 du Code du travail
 * (liste à jour du décret n° 2025-552 du 18 juin 2025). C'est l'activité principale de
 * l'employeur qui compte, pas l'intitulé du poste, et l'emploi doit être par nature temporaire.
 *
 * Retenus : les secteurs où une mission ponctuelle à La Réunion a un sens.
 * Écartés : chantiers et coopération à l'étranger, soutien des forces armées à l'étranger,
 * recherche sous convention internationale, médecine en centre de santé, sport professionnel,
 * insertion par l'activité économique, mise à disposition auprès de particuliers.
 * Hors liste (pas de contrat d'extra possible) : ménage chez les particuliers, bâtiment en France,
 * commerce, nettoyage, garages.
 * Même liste que la fonction SQL postes_du_secteur().
 */
export const SECTEURS = [
  'hotellerie_restauration',
  'loisirs_vacances',
  'spectacle',
  'demenagement',
  'enquetes_sondages',
  'activites_foraines',
  'entreposage_viande',
  'reparation_navale',
  'exploitation_forestiere',
  'enseignement',
] as const;
export type Secteur = (typeof SECTEURS)[number];

export const SECTEUR_PAR_DEFAUT: Secteur = 'hotellerie_restauration';

export const DEFINITION_SECTEURS: Record<
  Secteur,
  { libelle: string; exemples: string; postes: readonly Poste[]; convention: string | null }
> = {
  hotellerie_restauration: {
    libelle: 'Hôtellerie et restauration',
    exemples: 'Restaurant, hôtel, bar, traiteur',
    postes: ['serveur', 'barman', 'cuisine', 'commis', 'plonge', 'reception', 'etages'],
    convention: 'Convention collective nationale des hôtels, cafés, restaurants (IDCC 1979)',
  },
  loisirs_vacances: {
    libelle: 'Centres de loisirs et de vacances',
    exemples: 'Centre de vacances, accueil de loisirs, village vacances',
    postes: ['animation', 'cuisine', 'commis', 'plonge', 'etages', 'reception'],
    convention: null,
  },
  spectacle: {
    libelle: 'Spectacle, culture et audiovisuel',
    exemples: 'Salle de concert, festival, production, théâtre',
    postes: ['technique_spectacle', 'montage_spectacle', 'accueil_spectacle'],
    convention: null,
  },
  demenagement: {
    libelle: 'Déménagement',
    exemples: 'Entreprise de déménagement',
    postes: ['demenagement'],
    convention: null,
  },
  enquetes_sondages: {
    libelle: 'Enquêtes et sondages',
    exemples: "Institut d'études, de sondage",
    postes: ['enquete'],
    convention: null,
  },
  activites_foraines: {
    libelle: 'Activités foraines',
    exemples: 'Fête foraine, manège, stand',
    postes: ['fete_foraine'],
    convention: null,
  },
  entreposage_viande: {
    libelle: 'Entreposage et stockage de la viande',
    exemples: 'Entrepôt frigorifique de viande',
    postes: ['entrepot_viande'],
    convention: null,
  },
  reparation_navale: {
    libelle: 'Réparation navale',
    exemples: 'Chantier de réparation de navires',
    postes: ['reparation_navale'],
    convention: null,
  },
  exploitation_forestiere: {
    libelle: 'Exploitation forestière',
    exemples: 'Exploitation, travaux en forêt',
    postes: ['travaux_forestiers'],
    convention: null,
  },
  enseignement: {
    libelle: 'Enseignement',
    exemples: 'Organisme de formation, établissement privé',
    postes: ['formation'],
    convention: null,
  },
};

export function postesDuSecteur(s: Secteur): readonly Poste[] {
  return DEFINITION_SECTEURS[s].postes;
}

export function estSecteur(v: unknown): v is Secteur {
  return typeof v === 'string' && (SECTEURS as readonly string[]).includes(v);
}
