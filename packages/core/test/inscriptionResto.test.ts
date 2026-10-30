import { describe, expect, it } from 'vitest';
import { formatSiret, normaliserSiret, siretValide, validerInscriptionResto } from '../src';

describe('SIRET', () => {
  it('accepte les numéros dont la clé de Luhn est juste', () => {
    expect(siretValide('73282932000074')).toBe(true);
    expect(siretValide('732 829 320 00074')).toBe(true);
    expect(siretValide('44306184100047')).toBe(true);
  });
  it('refuse un chiffre faux, une longueur fausse', () => {
    expect(siretValide('73282932000075')).toBe(false);
    expect(siretValide('7328293200007')).toBe(false);
    expect(siretValide('')).toBe(false);
  });
  it('applique la règle particulière de La Poste', () => {
    expect(siretValide('35600000000042')).toBe(true); // somme des chiffres : 20
    expect(siretValide('35600000000043')).toBe(false); // somme : 21
  });
  it('formate et nettoie la saisie', () => {
    expect(normaliserSiret(' 732-829-320 00074 ')).toBe('73282932000074');
    expect(formatSiret('73282932000074')).toBe('732 829 320 00074');
  });
});

describe('inscription restaurateur', () => {
  const ok = { etablissement: 'Le Boucan Grillé', adresseChoisie: true, siret: '73282932000074', telephone: '0692 12 34 56', motDePasse: 'kivien974' };
  it('accepte une saisie complète', () => {
    expect(validerInscriptionResto(ok)).toEqual({});
  });
  it('signale chaque champ manquant ou faux', () => {
    const e = validerInscriptionResto({ etablissement: ' ', adresseChoisie: false, siret: '123', telephone: '0612345678', motDePasse: 'court' });
    expect(Object.keys(e)).toEqual(['etablissement', 'adresseChoisie', 'siret', 'telephone', 'motDePasse']);
  });
  it('ne redemande pas mobile et mot de passe quand le compte est déjà ouvert', () => {
    expect(validerInscriptionResto({ ...ok, telephone: '', motDePasse: '' }, true)).toEqual({});
  });
});
