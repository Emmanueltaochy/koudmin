/** Adresse e-mail nettoyée (espaces, majuscules). */
export function normaliserEmail(saisie: string): string {
  return saisie.trim().toLowerCase();
}

/** Contrôle de forme seulement : l'adresse est ensuite confirmée par un lien envoyé dessus. */
export function emailValide(saisie: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s.]{2,}$/.test(normaliserEmail(saisie));
}
