import { describe, expect, it } from 'vitest';
import { formatMobileReunion, normaliserMobileReunion } from '../src';

describe('téléphone réunionnais', () => {
  it.each([
    '0692 12 34 56',
    '0692123456',
    '06.92.12.34.56',
    '+262 692 12 34 56',
    '+262692123456',
    '00262692123456',
    '262692123456',
    '+262 (0)692 12 34 56',
  ])('normalise « %s »', (saisie) => {
    expect(normaliserMobileReunion(saisie)).toBe('+262692123456');
  });

  it('accepte 0693', () => {
    expect(normaliserMobileReunion('0693 00 11 22')).toBe('+262693001122');
  });

  it.each(['0262 12 34 56', '0612345678', '0694123456', '069212345', '+33692123456', ''])(
    'refuse « %s »',
    (saisie) => {
      expect(normaliserMobileReunion(saisie)).toBeNull();
    },
  );

  it('affiche au format local', () => {
    expect(formatMobileReunion('+262692123456')).toBe('0692 12 34 56');
  });
});
