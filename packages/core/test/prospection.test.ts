import { describe, expect, it } from 'vitest';
import { modeleCampagne } from '../src';

describe('prospection', () => {
  it('message de lancement : frais lus dans les paramètres, ni « ! » ni montant écrit en dur', () => {
    const m = modeleCampagne('3,50 €');
    expect(m.message).toContain("3,50 € HT par heure d'extra");
    expect(modeleCampagne('22,00 €').message).toContain('22,00 €');
    expect(m.message + m.sujet).not.toContain('!');
    expect(m.message).toContain('{commune}');
  });
});
