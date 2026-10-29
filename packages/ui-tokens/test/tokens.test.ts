import { describe, expect, it } from 'vitest';
import { couleurs, familleNative, interlettragePx, texteSur, typo } from '../src';
import { tokensCss } from '../src/css';

describe('charte', () => {
  it('reprend les hex exacts de la charte', () => {
    expect(couleurs).toEqual({
      creme: '#FBF6EE',
      blanc: '#FFFFFF',
      basalte: '#211C18',
      galet: '#6B6157',
      trait: '#E6DCCF',
      piment: '#C2401E',
      pimentFonce: '#9E3215',
      curcuma: '#F2B33D',
      vacoa: '#2C7350',
      braise: '#8A1C12',
    });
  });

  it('impose le basalte sur le curcuma et le blanc sur le piment', () => {
    expect(texteSur.curcuma).toBe('basalte');
    expect(texteSur.piment).toBe('blanc');
  });

  it("n'a aucun corps de texte sous 16 px (légendes 13 et boutons 15 exceptés)", () => {
    const exceptions = ['legende', 'legendeForte', 'badge', 'bouton'];
    for (const [nom, s] of Object.entries(typo)) {
      if (!exceptions.includes(nom)) expect(s.taille, nom).toBeGreaterThanOrEqual(16);
    }
  });

  it('convertit l’interlettrage em en px pour React Native', () => {
    expect(interlettragePx(typo.affiche)).toBe(-1.12);
    expect(interlettragePx(typo.miLeLa)).toBe(0.22);
  });

  it('génère les variables CSS', () => {
    const css = tokensCss();
    expect(css).toContain('--k-piment-fonce: #9E3215;');
    expect(css).toContain("--k-titre-font: 700 32px/38px var(--k-font-titre);");
    expect(css).toContain('--k-rayon-pilule: 999px;');
  });

  it('associe une police native à chaque style', () => {
    expect(familleNative(typo.titre)).toBe('BricolageGrotesque-700-32');
    expect(familleNative(typo.sousTitre)).toBe('BricolageGrotesque-600-22');
    expect(familleNative(typo.corpsFort)).toBe('Figtree_600SemiBold');
  });
});
