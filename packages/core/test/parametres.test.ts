import { describe, expect, it } from 'vitest';
import { parametresEnVigueur, type ParametresTarifaires } from '../src';

const liste: ParametresTarifaires[] = [
  { dateEffet: '2026-01-01', tauxHoraireBrutCentimes: 1231, fraisMiseEnRelationHTCentimes: 2500, tvaPourMille: 85 },
  { dateEffet: '2027-01-01', tauxHoraireBrutCentimes: 1260, fraisMiseEnRelationHTCentimes: 2500, tvaPourMille: 85 },
  { dateEffet: '2025-01-01', tauxHoraireBrutCentimes: 1183, fraisMiseEnRelationHTCentimes: 2500, tvaPourMille: 85 },
];

describe('paramètres tarifaires', () => {
  it('prend la dernière date d’effet passée', () => {
    expect(parametresEnVigueur(liste, '2026-10-30').tauxHoraireBrutCentimes).toBe(1231);
    expect(parametresEnVigueur(liste, '2026-12-31').tauxHoraireBrutCentimes).toBe(1231);
    expect(parametresEnVigueur(liste, '2027-01-01').tauxHoraireBrutCentimes).toBe(1260);
  });
  it('échoue sans paramètre en vigueur', () => {
    expect(() => parametresEnVigueur(liste, '2024-06-01')).toThrow();
  });
});
