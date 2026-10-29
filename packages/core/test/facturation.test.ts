import { describe, expect, it } from 'vitest';
import { miseEnRelationFacturee, totauxFacture, tvaCentimes } from '../src';

describe('facturation', () => {
  it('ne facture ni l’absence ni le désistement', () => {
    expect(miseEnRelationFacturee('confirmee')).toBe(true);
    expect(miseEnRelationFacturee('terminee')).toBe(true);
    expect(miseEnRelationFacturee('absente')).toBe(false);
    expect(miseEnRelationFacturee('desistee')).toBe(false);
  });
  it('TVA de La Réunion (8,5 %) au centime', () => {
    expect(tvaCentimes(2500, 85)).toBe(213); // 212,5 → 213
    expect(totauxFacture(4, 2500, 85)).toEqual({ htCentimes: 10000, tvaCentimes: 850, ttcCentimes: 10850 });
  });
});
