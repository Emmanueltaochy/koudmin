import { describe, expect, it } from 'vitest';
import {
  formatCoefficient,
  lireCoefficient,
  prixToutComprisCentimes,
  textesFormules,
} from '../src';
import { l } from './aide';

describe('formule tout compris', () => {
  it('calcule le prix en entiers, arrondi au centime', () => {
    // 6 h à 12,31 € × 2 = 147,72 €
    expect(prixToutComprisCentimes(1231, 360, 2000)).toBe(14772);
    // 2 h 30 à 12,31 € × 1,95 = 60,01125 € → 60,01 €
    expect(prixToutComprisCentimes(1231, 150, 1950)).toBe(6001);
    // 1 h à 10,01 € × 1,5 = 15,015 € → 15,02 € (arrondi au demi supérieur, comme la base)
    expect(prixToutComprisCentimes(1001, 60, 1500)).toBe(1502);
    expect(() => prixToutComprisCentimes(12.5, 60, 2000)).toThrow();
  });

  it('lit et écrit le coefficient', () => {
    expect(lireCoefficient('2')).toBe(2000);
    expect(lireCoefficient(' 1,95 ')).toBe(1950);
    expect(lireCoefficient('1.855')).toBe(1855);
    expect(lireCoefficient('0,9')).toBeNull();
    expect(lireCoefficient('4,5')).toBeNull();
    expect(lireCoefficient('deux')).toBeNull();
    expect(formatCoefficient(2000)).toBe('× 2');
    expect(formatCoefficient(1950)).toBe('× 1,95');
  });

  it('détaille le prix affiché', () => {
    expect(l(textesFormules.demande.legendePrix(2, 360, 1231, 2000))).toBe(
      '2 × 6 h × 12,31 € × 2. Salaire, charges et formalités compris.',
    );
  });
});
