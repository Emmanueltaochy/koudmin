'use client';

/**
 * Établissement affiché dans l'espace, retenu dans ce navigateur. Changer d'établissement
 * prévient les écrans ouverts, qui se rechargent.
 */
const CLE = 'kivien-etablissement';
const ecouteurs = new Set<() => void>();
let memoire: string | null = null;

export function etablissementCourant(): string | null {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

export function choisirEtablissement(id: string) {
  try {
    localStorage.setItem(CLE, id);
  } catch {
    // Navigation privée : le choix vaut pour la page ouverte.
  }
  memoire = id;
  ecouteurs.forEach((f) => f());
}


/** Choix retenu (stockage ou mémoire de la page), parmi les identifiants permis. */
export function resoudreEtablissement<T extends { id: string }>(liste: T[]): T {
  if (!liste.length) throw new Error('Aucun établissement');
  const voulu = memoire ?? etablissementCourant();
  return liste.find((e) => e.id === voulu) ?? liste[0]!;
}

export function ecouterEtablissement(rappel: () => void): () => void {
  ecouteurs.add(rappel);
  return () => {
    ecouteurs.delete(rappel);
  };
}
