/** App des extras en version web, en attendant les stores. */
export const URL_APP_EXTRA = process.env.NEXT_PUBLIC_URL_APP_EXTRA ?? 'https://app.kivien.re';

/**
 * Destinations des liens de la page d'accueil, réunies ici pour être complétées au fur et à mesure.
 * « # » : page ou service pas encore en place (stores, pages légales, aide).
 */
export const LIENS_VITRINE = {
  seConnecter: '/connexion',
  creerCompte: '/inscription',
  trouverExtra: '/inscription/restaurant',
  telechargerApp: `${URL_APP_EXTRA}/bienvenue`,
  pied: {
    'Trouver un extra': '/inscription/restaurant',
    Tarif: '#tarif',
    "Le contrat d'extra": '#contrat',
    'Se connecter': '/connexion',
    'Devenir extra': '/extras',
    'Missions près de chez moi': `${URL_APP_EXTRA}/bienvenue`,
    'Mes droits': '#',
    'Questions fréquentes': '#',
    'Nous écrire': 'mailto:bonjour@kivien.re',
    'bonjour@kivien.re': 'mailto:bonjour@kivien.re',
    Android: '#',
    iPhone: '#',
    'Mentions légales': '#',
    CGV: '#',
    Confidentialité: '#',
    Cookies: '#',
  } as Record<string, string>,
} as const;

/** Logos des établissements partenaires. Vide : emplacements « Logo partenaire » de la maquette. */
export const PARTENAIRES: { nom: string; src: string }[] = [];

/** Photos du haut de page (visuels de travail de la maquette, à remplacer par des photos sous licence). */
export const PHOTOS_HAUT = {
  monte: [
    { src: '/vitrine/cuisine.jpg', alt: 'Cuisine', hauteur: 340 },
    { src: '/vitrine/aide-a-domicile.jpg', alt: 'Aide à domicile', hauteur: 260 },
    { src: '/vitrine/menage.jpg', alt: 'Ménage', hauteur: 280 },
  ],
  descend: [
    { src: '/vitrine/salle.jpg', alt: 'Service en salle', hauteur: 340 },
    { src: '/vitrine/batiment.jpg', alt: 'Bâtiment', hauteur: 280 },
    { src: '/vitrine/nettoyage-auto.jpg', alt: 'Nettoyage auto', hauteur: 260 },
  ],
};

/** Photo associée à chaque témoignage, dans l'ordre de textesVitrine.temoignages.liste. */
export const PHOTOS_TEMOIGNAGES = ['/vitrine/cuisine.jpg', '/vitrine/salle.jpg', '/vitrine/aide-a-domicile.jpg', '/vitrine/batiment.jpg'];
