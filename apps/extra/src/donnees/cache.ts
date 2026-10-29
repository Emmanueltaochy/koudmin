import type { MissionResume } from '@kivien/core';

/**
 * Dernière liste reçue. Le détail s'affiche aussitôt à partir de la carte touchée,
 * sans écran de chargement, puis se complète avec la réponse du serveur.
 */
export const cacheMissions = new Map<string, MissionResume>();

export function memoriserMissions(missions: readonly MissionResume[]): void {
  for (const m of missions) cacheMissions.set(m.id, m);
}
