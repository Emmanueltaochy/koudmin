import { describe, expect, it } from 'vitest';
import { etatMissionFiche, resumeFicheExtra, type MissionFicheExtra } from '../src';

const base: MissionFicheExtra = {
  affectationId: 'a',
  demandeId: 'd',
  etablissement: 'Le Boucan',
  commune: 'Saint-Paul',
  poste: 'serveur',
  intitule: null,
  jour: '2026-11-10',
  debut: 1080,
  fin: 0,
  tauxHoraireBrutCentimes: 1231,
  statut: 'confirmee',
  statutDemande: 'pourvue',
  desistementTardif: false,
  contratSigneExtra: true,
  contratSigneRestaurant: true,
  arriveeLe: null,
  departLe: null,
  present: true,
  note: 5,
  favori: false,
};
const MAINTENANT = new Date('2026-11-15T08:00:00Z');

describe('fiche d’un extra', () => {
  it('range chaque mission', () => {
    expect(etatMissionFiche(base, MAINTENANT)).toBe('faite');
    expect(etatMissionFiche({ ...base, jour: '2026-11-20' }, MAINTENANT)).toBe('a_venir');
    expect(etatMissionFiche({ ...base, statut: 'absente' }, MAINTENANT)).toBe('absente');
    expect(etatMissionFiche({ ...base, present: false }, MAINTENANT)).toBe('absente');
    expect(etatMissionFiche({ ...base, statut: 'desistee' }, MAINTENANT)).toBe('desistee');
    expect(
      etatMissionFiche({ ...base, statutDemande: 'annulee', jour: '2026-11-20' }, MAINTENANT),
    ).toBe('annulee');
    // Mission qui finit à minuit : faite seulement après minuit.
    expect(
      etatMissionFiche({ ...base, jour: '2026-11-15' }, new Date('2026-11-15T19:59:00Z')),
    ).toBe('a_venir');
    expect(
      etatMissionFiche({ ...base, jour: '2026-11-15' }, new Date('2026-11-15T20:00:00Z')),
    ).toBe('faite');
  });
  it('totalise les missions faites (6 h au SMIC = 81,25 € brut congés compris)', () => {
    const r = resumeFicheExtra(
      [
        base,
        { ...base, affectationId: 'b', etablissement: 'Ti Kaz', note: 4 },
        { ...base, affectationId: 'c', jour: '2026-11-20', note: null },
        { ...base, affectationId: 'd', statut: 'desistee', desistementTardif: true, note: null },
      ],
      MAINTENANT,
    );
    expect(r).toMatchObject({
      faites: 2,
      aVenir: 1,
      absences: 0,
      desistements: 1,
      desistementsTardifs: 1,
      notes: 2,
      noteMoyenneDixiemes: 45,
      etablissements: 2,
    });
    expect(r.brutFaitCentimes).toBe(2 * 8125);
    expect(r.brutAVenirCentimes).toBe(8125);
    expect(r.netFaitEuros).toBeGreaterThan(0);
  });
});
