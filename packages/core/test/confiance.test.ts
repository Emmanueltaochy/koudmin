import { describe, expect, it } from 'vitest';
import { badgesConfiance, lignePointage, pointageOuvert } from '../src';
import { l } from './aide';

describe('badges de confiance', () => {
  it('un extra sans historique', () => {
    expect(
      badgesConfiance({
        missions: 0,
        notes: 0,
        noteMoyenneDixiemes: null,
        absences: 0,
        dossierComplet: false,
      }),
    ).toEqual(['Première mission sur Kivien']);
  });
  it('un extra régulier', () => {
    expect(
      badgesConfiance({
        missions: 5,
        notes: 4,
        noteMoyenneDixiemes: 48,
        absences: 0,
        dossierComplet: true,
      }).map(l),
    ).toEqual([
      '5 missions réalisées sur Kivien',
      'Note 4,8 sur 5',
      'Aucune absence',
      'Dossier du contrat complet',
    ]);
  });
  it('moyenne cachée sous 3 notes, présence seulement sans absence', () => {
    expect(
      badgesConfiance({
        missions: 4,
        notes: 2,
        noteMoyenneDixiemes: 50,
        absences: 1,
        dossierComplet: false,
      }),
    ).toEqual(['4 missions réalisées sur Kivien']);
    expect(
      badgesConfiance({
        missions: 1,
        notes: 0,
        noteMoyenneDixiemes: null,
        absences: 0,
        dossierComplet: false,
      }),
    ).toEqual(['1 mission réalisée sur Kivien']);
  });
});

describe('pointage', () => {
  it('résume arrivée et départ', () => {
    expect(lignePointage(null, null)).toBeNull();
    expect(l(lignePointage(1082, null)!)).toBe('Arrivée pointée à 18 h 02');
    expect(l(lignePointage(1082, 1390)!)).toBe('Arrivée pointée à 18 h 02 · départ à 23 h 10');
  });
});

describe('fenêtre de pointage', () => {
  it('de 1 h avant le début à 6 h après la fin, minuit compris', () => {
    // Mission du 3 novembre, 18 h à minuit (La Réunion = UTC+4).
    expect(pointageOuvert('2026-11-03', 1080, 0, new Date('2026-11-03T12:59:00Z'))).toBe(false);
    expect(pointageOuvert('2026-11-03', 1080, 0, new Date('2026-11-03T13:00:00Z'))).toBe(true);
    expect(pointageOuvert('2026-11-03', 1080, 0, new Date('2026-11-04T02:00:00Z'))).toBe(true);
    expect(pointageOuvert('2026-11-03', 1080, 0, new Date('2026-11-04T02:01:00Z'))).toBe(false);
  });
});
