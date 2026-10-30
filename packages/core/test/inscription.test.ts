import { describe, expect, it } from 'vitest';
import { COMMUNES_REUNION, lireDate, validerInfosContrat, validerInscription, validerMotDePasse } from '../src';

describe('inscription extra', () => {
  it('exige un mot de passe de 8 caractères minimum', () => {
    expect(validerMotDePasse('1234567')).toBe('Choisis un mot de passe de 8 caractères minimum.');
    expect(validerMotDePasse('')).not.toBeNull();
    expect(validerMotDePasse('kivien97')).toBeNull();
    expect(validerMotDePasse('péi lé la')).toBeNull();
  });
  it('compte 24 communes, toutes à La Réunion', () => {
    expect(COMMUNES_REUNION).toHaveLength(24);
    for (const c of COMMUNES_REUNION) {
      expect(c.lat).toBeGreaterThan(-21.4);
      expect(c.lat).toBeLessThan(-20.85);
      expect(c.lng).toBeGreaterThan(55.2);
      expect(c.lng).toBeLessThan(55.85);
    }
  });
  it('accepte une inscription complète, refuse les champs manquants', () => {
    const ok = { prenom: 'Kévin', nom: 'Hoarau', telephone: '0692 00 00 01', commune: 'Saint-Paul', aVoiture: false };
    expect(validerInscription(ok)).toEqual({});
    const e = validerInscription({ prenom: ' ', nom: '', telephone: '0612345678', commune: 'Paris', aVoiture: null });
    expect(Object.keys(e)).toEqual(['prenom', 'nom', 'telephone', 'commune', 'aVoiture']);
    expect(e.telephone).toContain('Indique un mobile réunionnais');
  });
});

describe('infos du contrat', () => {
  it('lit les dates françaises et refuse les dates impossibles', () => {
    expect(lireDate('12/05/2001')).toBe('2001-05-12');
    expect(lireDate('31/02/2001')).toBeNull();
    expect(lireDate('2001-05-12')).toBeNull();
  });
  it('valide le NIR et la date', () => {
    const corps = '1010597415123';
    const nir = corps + String(97 - Number(BigInt(corps) % 97n)).padStart(2, '0');
    const ok = { dateNaissance: '12/05/2001', lieuNaissance: 'Saint-Paul', nir, adresse: '5 chemin des Vacoas, Saint-Paul' };
    expect(validerInfosContrat(ok, '2026-10-29')).toEqual({});
    expect(Object.keys(validerInfosContrat({ ...ok, nir: '123', dateNaissance: '01/01/2030' }, '2026-10-29'))).toEqual([
      'dateNaissance',
      'nir',
    ]);
  });
  it('accepte un numéro de sécurité sociale laissé vide (DPAE avec date et lieu de naissance)', () => {
    const ok = { dateNaissance: '12/05/2001', lieuNaissance: 'Saint-Paul', nir: '  ', adresse: '5 chemin des Vacoas, Saint-Paul' };
    expect(validerInfosContrat(ok, '2026-10-29')).toEqual({});
  });
});
