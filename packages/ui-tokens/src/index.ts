/**
 * Charte Koudmin : source unique des couleurs, typographies, rayons et espacements.
 * Consommée telle quelle par l'app extra (React Native) et convertie en variables CSS
 * (`dist/tokens.css`) pour le site restaurateur.
 */

export const couleurs = {
  /** Fond de page. */
  creme: '#FBF6EE',
  /** Fond des cartes et des champs. */
  blanc: '#FFFFFF',
  /** Texte principal, titres, chips sélectionnées, icônes. */
  basalte: '#211C18',
  /** Texte secondaire, légendes, bordures de champs, icônes secondaires. */
  galet: '#6B6157',
  /** Séparateurs uniquement : jamais texte, jamais bordure de champ. */
  trait: '#E6DCCF',
  /** Marque et action principale. Un seul élément piment par écran. Texte blanc dessus. */
  piment: '#C2401E',
  /** Survol du bouton piment, état « envoi », liens. */
  pimentFonce: '#9E3215',
  /** Urgence, « Ce soir ». Toujours texte basalte. */
  curcuma: '#F2B33D',
  /** Succès : confirmé, retour assuré. Texte blanc dessus. */
  vacoa: '#2C7350',
  /** Erreur, absence non prévenue, désistement. */
  braise: '#8A1C12',
} as const;

export type Couleur = keyof typeof couleurs;

/** Couleur de texte imposée sur chaque fond plein. */
export const texteSur = {
  creme: 'basalte',
  blanc: 'basalte',
  basalte: 'blanc',
  piment: 'blanc',
  pimentFonce: 'blanc',
  curcuma: 'basalte',
  vacoa: 'blanc',
  braise: 'blanc',
} as const satisfies Partial<Record<Couleur, Couleur>>;

/** Voile sous les bottom sheets : basalte à 50 %. */
export const voile = 'rgba(33,28,24,0.5)';

/** Familles de polices. Sur le web : nom Google Fonts. Sur React Native : un nom par graisse (expo-google-fonts). */
export const polices = {
  titre: {
    web: "'Bricolage Grotesque', sans-serif",
    natif: { 600: 'BricolageGrotesque_600SemiBold', 700: 'BricolageGrotesque_700Bold' },
  },
  texte: {
    web: 'Figtree, sans-serif',
    natif: {
      400: 'Figtree_400Regular',
      500: 'Figtree_500Medium',
      600: 'Figtree_600SemiBold',
      700: 'Figtree_700Bold',
    },
  },
} as const;

export type Famille = keyof typeof polices;
export type Graisse = 400 | 500 | 600 | 700;

export interface StyleTexte {
  famille: Famille;
  graisse: Graisse;
  /** Taille en px. */
  taille: number;
  /** Interlignage en px. */
  interligne: number;
  /** Interlettrage en em (0 si absent). */
  interlettrage: number;
}

export const typo = {
  affiche: { famille: 'titre', graisse: 700, taille: 56, interligne: 60, interlettrage: -0.02 },
  titre: { famille: 'titre', graisse: 700, taille: 32, interligne: 38, interlettrage: -0.01 },
  sousTitre: { famille: 'titre', graisse: 600, taille: 22, interligne: 28, interlettrage: 0 },
  /** Horaire des cartes mission, nom « Koudmin » en en-tête. */
  horaire: { famille: 'titre', graisse: 700, taille: 22, interligne: 28, interlettrage: 0 },
  /** Bouton « Mi lé la » : seule exception au style bouton. */
  miLeLa: { famille: 'titre', graisse: 700, taille: 22, interligne: 28, interlettrage: 0.01 },
  corps: { famille: 'texte', graisse: 400, taille: 16, interligne: 24, interlettrage: 0 },
  /** Horaires, tarifs, adresses. */
  corpsFort: { famille: 'texte', graisse: 600, taille: 16, interligne: 24, interlettrage: 0 },
  bouton: { famille: 'texte', graisse: 700, taille: 15, interligne: 20, interlettrage: 0 },
  legende: { famille: 'texte', graisse: 500, taille: 13, interligne: 18, interlettrage: 0 },
  legendeForte: { famille: 'texte', graisse: 600, taille: 13, interligne: 18, interlettrage: 0 },
  badge: { famille: 'texte', graisse: 700, taille: 13, interligne: 18, interlettrage: 0 },
} as const satisfies Record<string, StyleTexte>;

export type StyleTypo = keyof typeof typo;

export const rayons = {
  /** Champs, badges, chips de poste, cases. */
  champ: 6,
  /** Cartes, boutons, bandeaux. */
  carte: 12,
  /** Forme signature, réservée aux créneaux horaires. */
  pilule: 999,
} as const;

/** Grille de 4 px. `s12` reste ponctuel (padding interne). */
export const espaces = { s4: 4, s8: 8, s12: 12, s16: 16, s32: 32 } as const;

export const dimensions = {
  champHauteur: 48,
  boutonPrincipal: 56,
  boutonMiLeLa: 64,
  boutonSecondaire: 48,
  stepper: 48,
  caseACocher: 24,
  /** Cible tactile minimale. */
  cibleTactile: 44,
  iconeCarte: 20,
  iconeTabBar: 24,
  bordureErreur: 2,
} as const;

export const ombres = {
  carte: { x: 0, y: 1, flou: 0, couleur: couleurs.trait },
} as const;

export const animations = {
  /** Rotation du spinner, linéaire, infinie. */
  spinnerMs: 900,
  /** Pulse des squelettes, opacity 1 → 0.45, ease-in-out. */
  squeletteMs: 1400,
  squeletteOpaciteMin: 0.45,
} as const;

/** Interlettrage React Native (en px) à partir d'un style en em. */
export function interlettragePx(style: StyleTexte): number {
  return Math.round(style.interlettrage * style.taille * 100) / 100;
}
