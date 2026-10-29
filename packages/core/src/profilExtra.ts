import { LIBELLES_POSTE, POSTES, type Poste } from './postes';

/** Profil public de l'extra : ce que voient les restaurants où il ou elle a une mission. */

export const EXPERIENCES = ['debutant', 'moins_1_an', '1_3_ans', 'plus_3_ans'] as const;
export type Experience = (typeof EXPERIENCES)[number];
export const LIBELLES_EXPERIENCE: Record<Experience, string> = {
  debutant: 'Première fois',
  moins_1_an: "Moins d'un an de métier",
  '1_3_ans': 'De 1 à 3 ans de métier',
  plus_3_ans: 'Plus de 3 ans de métier',
};

export const LANGUES = ['francais', 'creole', 'anglais', 'espagnol', 'allemand', 'italien'] as const;
export type Langue = (typeof LANGUES)[number];
export const LIBELLES_LANGUE: Record<Langue, string> = {
  francais: 'Français',
  creole: 'Créole',
  anglais: 'Anglais',
  espagnol: 'Espagnol',
  allemand: 'Allemand',
  italien: 'Italien',
};

/** Longueur maximale de la présentation, identique à la contrainte de la base. */
export const PRESENTATION_MAX = 280;

export interface ProfilPublic {
  competences: Poste[];
  experience: Experience | null;
  langues: Langue[];
  presentation: string;
}

/** Espaces superflus retirés ; les retours à la ligne simples sont gardés. */
export function normaliserPresentation(texte: string): string {
  return texte
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

/** Nombre de caractères restants (négatif si le texte est trop long). */
export function caracteresRestants(texte: string): number {
  return PRESENTATION_MAX - [...normaliserPresentation(texte)].length;
}

/** Ordre stable des listes, quel que soit l'ordre des appuis. */
export function trierCompetences(c: readonly Poste[]): Poste[] {
  return POSTES.filter((p) => c.includes(p));
}
export function trierLangues(l: readonly Langue[]): Langue[] {
  return LANGUES.filter((x) => l.includes(x));
}

/** « Salle, Bar · De 1 à 3 ans de métier · Français, Créole » ; vide si rien n'est renseigné. */
export function resumeProfil(p: Pick<ProfilPublic, 'competences' | 'experience' | 'langues'>): string {
  const parties = [
    trierCompetences(p.competences).map((c) => LIBELLES_POSTE[c].court).join(', '),
    p.experience ? LIBELLES_EXPERIENCE[p.experience] : '',
    trierLangues(p.langues).map((l) => LIBELLES_LANGUE[l]).join(', '),
  ].filter(Boolean);
  return parties.join(' · ');
}

/** Initiales pour l'avatar sans photo : « Kévin Hoarau » → « KH ». */
export function initiales(prenom: string, nom: string): string {
  return [prenom, nom]
    .map((m) => [...m.trim()][0] ?? '')
    .join('')
    .toLocaleUpperCase('fr');
}
