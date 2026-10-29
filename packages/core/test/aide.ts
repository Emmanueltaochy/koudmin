/** Remplace les espaces insécables par des espaces simples pour comparer au texte du README. */
export const l = (s: string) => s.replace(/ /g, ' ');

/** Taux de test : le SMIC 2026. Fixture uniquement, le code le lit dans `parametres`. */
export const SMIC = 1231;
export const FRAIS = 2500;
