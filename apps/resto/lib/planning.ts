import type { JourISO } from '@kivien/core';
import type { DemandeSuivi, ExtraAffecte } from './donnees';
import { extrasActifs } from './phase';

/** Créneau d'une demande dans une case du planning. */
export interface Creneau {
  demande: DemandeSuivi;
  /** Places encore à pourvoir (ligne « Recherche en cours »). */
  restants?: number;
}

export interface LignePlanning {
  /** Extra de la ligne, ou null pour les places encore à pourvoir. */
  extra: ExtraAffecte | null;
  /** Créneaux par jour (« AAAA-MM-JJ »), triés par heure. */
  parJour: Record<JourISO, Creneau[]>;
}

/**
 * Lignes du planning d'une semaine : une par extra venu ou attendu, puis une pour les
 * places encore à pourvoir. Les demandes annulées n'y figurent pas.
 */
export function lignesPlanning(demandes: DemandeSuivi[], jours: JourISO[]): LignePlanning[] {
  const semaine = new Set(jours);
  const dansLaSemaine = demandes
    .filter((d) => semaine.has(d.jour) && d.statut !== 'annulee')
    .sort((a, b) => a.jour.localeCompare(b.jour) || a.debut - b.debut);
  const parExtra = new Map<string, LignePlanning>();
  const aPourvoir: LignePlanning = { extra: null, parJour: {} };
  for (const d of dansLaSemaine) {
    const actifs = extrasActifs(d).filter((e) => e.statut !== 'absente');
    for (const e of actifs) {
      const ligne = parExtra.get(e.extraId) ?? { extra: e, parJour: {} };
      (ligne.parJour[d.jour] ??= []).push({ demande: d });
      parExtra.set(e.extraId, ligne);
    }
    const restants = d.statut === 'terminee' ? 0 : d.nbExtras - extrasActifs(d).length;
    if (restants > 0) (aPourvoir.parJour[d.jour] ??= []).push({ demande: d, restants });
  }
  const lignes = [...parExtra.values()].sort((a, b) => a.extra!.prenom.localeCompare(b.extra!.prenom, 'fr'));
  return Object.keys(aPourvoir.parJour).length ? [...lignes, aPourvoir] : lignes;
}
