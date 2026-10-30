import { describe, expect, it } from 'vitest';
import { modeleCampagne } from '../src';

describe('prospection', () => {
  it('message de lancement : frais lus dans les paramètres, ni « ! » ni montant écrit en dur', () => {
    const m = modeleCampagne('19,00 €');
    expect(m.message).toContain('19,00 € HT par mise en relation');
    expect(modeleCampagne('22,00 €').message).toContain('22,00 €');
    expect(m.message + m.sujet).not.toContain('!');
    expect(m.message).toContain('{commune}');
  });
});
