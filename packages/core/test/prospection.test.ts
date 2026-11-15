import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMUNES_REUNION, modeleCampagne, modeleRelance, zoneDeCommune } from '../src';

describe('prospection', () => {
  it('message de lancement : frais lus dans les paramètres, ni « ! » ni montant écrit en dur', () => {
    const m = modeleCampagne('3,50 €');
    expect(m.message).toContain("3,50 € HT par heure d'extra");
    expect(modeleCampagne('22,00 €').message).toContain('22,00 €');
    expect(m.message + m.sujet).not.toContain('!');
    expect(m.message).toContain('{commune}');
  });
});

describe('prospection automatique', () => {
  it('relance sans « ! » ni montant écrit en dur', () => {
    const r = modeleRelance('3,50 €');
    expect(r.message).toContain("3,50 € HT par heure d'extra");
    expect(r.message + r.sujet).not.toContain('!');
    expect(r.sujet).toContain('{commune}');
  });
  it('la base découpe les communes en zones comme core', () => {
    const migration = readFileSync(
      join(__dirname, '../../../supabase/migrations/20261115180000_prospection_automatique.sql'),
      'utf8',
    );
    for (const c of COMMUNES_REUNION)
      expect(migration).toContain(
        `('${c.nom.replace(/'/g, "''")}', '${zoneDeCommune(c.nom)}', ${c.lat}, ${c.lng})`,
      );
  });
});
