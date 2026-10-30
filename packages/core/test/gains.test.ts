import { describe, expect, it } from 'vitest';
import { resumeGains, type MissionGain } from '../src';

const base: MissionGain = {
  demandeId: 'd', restaurant: 'Le Boucan Grillé', commune: 'Saint-Paul', poste: 'serveur', jour: '2026-10-24',
  debut: 1080, fin: 0, tauxHoraireBrutCentimes: 1231, effectuee: true, contratSigneExtra: true, contratSigneRestaurant: true,
};

describe('Mes gains', () => {
  it('additionne les missions effectuées avec contrat signé, au mois et à l’année', () => {
    const r = resumeGains(
      [
        base,
        { ...base, demandeId: 'd2', jour: '2026-09-12' },
        { ...base, demandeId: 'd3', jour: '2026-10-31', effectuee: false },
        { ...base, demandeId: 'd4', contratSigneExtra: false },
      ],
      '2026-10-30',
    );
    // 6 h × 12,31 € + 10 % de congés payés = 81,25 € brut par mission.
    expect(r.ceMois).toEqual({ missions: 1, brutCentimes: 8125, netEuros: 63 });
    expect(r.cetteAnnee.missions).toBe(2);
    expect(r.cetteAnnee.brutCentimes).toBe(16250);
    expect(r.aVenir).toEqual({ missions: 1, brutCentimes: 8125, netEuros: 63 });
  });
  it('ne compte rien sans mission', () => {
    expect(resumeGains([], '2026-10-30').cetteAnnee).toEqual({ missions: 0, brutCentimes: 0, netEuros: 0 });
  });
});
