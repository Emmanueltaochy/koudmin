import { describe, expect, it } from 'vitest';
import { fraisParExtraCentimes, parametresEnVigueur, type ParametresTarifaires } from '../src';

const liste: ParametresTarifaires[] = [
  {
    dateEffet: '2026-01-01',
    tauxHoraireBrutCentimes: 1231,
    fraisMiseEnRelationHTCentimes: 0,
    fraisHoraireHTCentimes: 350,
    dureeMinimumMinutes: 120,
    tvaPourMille: 85,
  },
  {
    dateEffet: '2027-01-01',
    tauxHoraireBrutCentimes: 1260,
    fraisMiseEnRelationHTCentimes: 0,
    fraisHoraireHTCentimes: 350,
    dureeMinimumMinutes: 120,
    tvaPourMille: 85,
  },
  {
    dateEffet: '2025-01-01',
    tauxHoraireBrutCentimes: 1183,
    fraisMiseEnRelationHTCentimes: 0,
    fraisHoraireHTCentimes: 350,
    dureeMinimumMinutes: 120,
    tvaPourMille: 85,
  },
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

describe('frais à l’heure d’extra', () => {
  it('durée × tarif horaire, arrondi au centime, plus la part fixe', () => {
    const p = { fraisMiseEnRelationHTCentimes: 0, fraisHoraireHTCentimes: 350 };
    expect(fraisParExtraCentimes(p, 360)).toBe(2100);
    expect(fraisParExtraCentimes(p, 150)).toBe(875);
    expect(fraisParExtraCentimes(p, 125)).toBe(729); // 7,291… → 7,29 €
    expect(fraisParExtraCentimes(p, 135)).toBe(788); // 7,875 → 7,88 € (demi vers le haut)
    expect(
      fraisParExtraCentimes(
        { fraisMiseEnRelationHTCentimes: 1900, fraisHoraireHTCentimes: 0 },
        360,
      ),
    ).toBe(1900);
  });
});
