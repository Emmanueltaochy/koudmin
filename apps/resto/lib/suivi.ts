'use client';

import { source } from './donnees';

/**
 * Suivi des visiteurs venus d'un e-mail de prospection : le lien kivien.re/decouvrir/<jeton> range
 * le jeton dans le navigateur pendant 30 jours ; les pages vues et la création du compte sont
 * rattachées à cet envoi (espace admin, onglet Prospection).
 */
const CLE = 'kivien_prospection';
const DUREE_MS = 30 * 86400e3;

export function memoriserJeton(jeton: string) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ jeton, le: Date.now() }));
  } catch {
    // Stockage refusé (navigation privée) : le clic reste compté, pas la suite.
  }
}

export function jetonCourant(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null') as { jeton: string; le: number } | null;
    return v && Date.now() - v.le < DUREE_MS && /^[0-9a-f-]{36}$/i.test(v.jeton) ? v.jeton : null;
  } catch {
    return null;
  }
}

/** Page vue par un visiteur venu d'un e-mail (sans effet pour les autres). */
export function noterPage(chemin: string) {
  const jeton = jetonCourant();
  if (jeton) void source().admin.prospection.noterVisite(jeton, 'page', chemin).catch(() => undefined);
}

/** Compte établissement créé : rattaché à l'e-mail qui l'a amené. */
export async function noterInscription(restaurantId: string) {
  const jeton = jetonCourant();
  if (jeton) await source().admin.prospection.noterInscription(jeton, restaurantId).catch(() => undefined);
}
