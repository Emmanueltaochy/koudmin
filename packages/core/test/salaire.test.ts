import { describe, expect, it } from 'vitest';
import {
  brutParExtraCentimes,
  formatEuros,
  formatHT,
  formatNet,
  netEstimeEuros,
  recapDemande,
  salaireMission,
  tauxAutorise,
} from '../src';
import { FRAIS, l, SMIC } from './aide';

describe('salaire (exemples du README)', () => {
  it.each([
    [6 * 60, '81,25 €', '≈ 63 € net'],
    [4 * 60 + 30, '60,93 €', '≈ 48 € net'],
    [3 * 60 + 30, '47,39 €', '≈ 37 € net'],
    [7 * 60, '94,79 €', '≈ 74 € net'],
  ])('%i min → %s brut / %s', (minutes, brut, net) => {
    const s = salaireMission(minutes, SMIC);
    expect(l(formatEuros(s.brutCentimes))).toBe(brut);
    expect(l(formatNet(s.netEuros))).toBe(net);
  });

  it('arrondit le brut par extra au centime, puis multiplie : 2 × 81,25 = 162,50 €', () => {
    const r = recapDemande({
      minutes: 360,
      tauxHoraireBrutCentimes: SMIC,
      nbExtras: 2,
      fraisMiseEnRelationHTCentimes: FRAIS,
    });
    expect(r.brutParExtraCentimes).toBe(8125);
    expect(r.salairesBrutsCentimes).toBe(16250);
    expect(l(formatEuros(r.salairesBrutsCentimes))).toBe('162,50 €');
    expect(l(formatHT(r.fraisHTCentimes))).toBe('50 € HT');
  });

  it('suit le taux passé en paramètre (revalorisation du SMIC)', () => {
    expect(brutParExtraCentimes(360, 1300)).toBe(8580);
    expect(brutParExtraCentimes(360, SMIC)).not.toBe(brutParExtraCentimes(360, 1300));
  });

  it('arrondit le net à l’euro le plus proche', () => {
    expect(netEstimeEuros(8125)).toBe(63); // 63,375
    expect(netEstimeEuros(6093)).toBe(48); // 47,525
  });

  it('refuse les valeurs non entières ou négatives', () => {
    expect(() => brutParExtraCentimes(360.5, SMIC)).toThrow(RangeError);
    expect(() => brutParExtraCentimes(360, 12.31)).toThrow(RangeError);
    expect(() => brutParExtraCentimes(-60, SMIC)).toThrow(RangeError);
  });

  it('interdit un taux sous le SMIC', () => {
    expect(tauxAutorise(1230, SMIC)).toBe(false);
    expect(tauxAutorise(SMIC, SMIC)).toBe(true);
    expect(tauxAutorise(1500, SMIC)).toBe(true);
  });
});
