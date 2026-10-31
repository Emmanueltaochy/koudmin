import type { DemandeSuivi, Favori } from './source';

/** Extras favoris, avec le nombre de missions faites chez le restaurateur. */
export function agregerFavoris(demandes: readonly DemandeSuivi[]): Favori[] {
  const parExtra = new Map<string, Favori & { favori: boolean }>();
  for (const d of demandes)
    for (const e of d.extras) {
      const f = parExtra.get(e.extraId) ?? {
        extraId: e.extraId,
        prenom: e.prenom,
        nom: e.nom,
        missions: 0,
        favori: false,
      };
      f.missions += e.statut === 'terminee' ? 1 : 0;
      f.favori ||= e.favori;
      parExtra.set(e.extraId, f);
    }
  return [...parExtra.values()]
    .filter((f) => f.favori)
    .map(({ favori: _favori, ...f }) => f)
    .sort((a, b) => b.missions - a.missions || a.prenom.localeCompare(b.prenom));
}
