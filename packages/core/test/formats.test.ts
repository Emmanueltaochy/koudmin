import { describe, expect, it } from 'vitest';
import {
  choixDates,
  dateLongue,
  dureeMinutes,
  formatDistance,
  formatDuree,
  formatEuros,
  formatHeure,
  formatPlage,
  jourCourt,
  lireHeure,
  phraseDuree,
  aujourdhuiReunion,
  minuteReunion,
  quandMission,
} from '../src';
import { l } from './aide';

describe('horaires', () => {
  it('formate les heures comme la charte', () => {
    expect(l(formatHeure(18 * 60))).toBe('18 h');
    expect(l(formatHeure(11 * 60 + 30))).toBe('11 h 30');
    expect(formatHeure(0)).toBe('minuit');
    expect(formatHeure(24 * 60)).toBe('minuit');
    expect(l(formatHeure(60))).toBe('1 h');
    expect(l(formatHeure(20 * 60 + 5))).toBe('20 h 05');
  });

  it('formate les plages', () => {
    expect(l(formatPlage(1080, 0))).toBe('18 h – minuit');
    expect(l(formatPlage(690, 900))).toBe('11 h 30 – 15 h');
    expect(l(formatPlage(1080, 60))).toBe('18 h – 1 h');
    expect(formatPlage(1080, 0)).not.toContain(' ');
  });

  it('calcule la durée, y compris après minuit', () => {
    expect(dureeMinutes(lireHeure('18:00')!, lireHeure('00:00')!)).toBe(360);
    expect(dureeMinutes(1080, 60)).toBe(420);
    expect(dureeMinutes(1140, 1410)).toBe(270);
    expect(dureeMinutes(1080, 1080)).toBeNull();
  });

  it('lit les heures saisies', () => {
    expect(lireHeure('18:00')).toBe(1080);
    expect(lireHeure('9:15')).toBe(555);
    expect(lireHeure('24:00')).toBeNull();
    expect(lireHeure('18h')).toBeNull();
  });

  it('écrit la durée du service', () => {
    expect(l(phraseDuree(360))).toBe('6 heures de service.');
    expect(l(phraseDuree(60))).toBe('1 heure de service.');
    expect(l(phraseDuree(270))).toBe('4 h 30 de service.');
    expect(l(formatDuree(360))).toBe('6 h');
  });
});

describe('montants et distances', () => {
  it('sépare les milliers', () => {
    expect(l(formatEuros(125000))).toBe('1 250,00 €');
    expect(l(formatEuros(1231))).toBe('12,31 €');
  });
  it('affiche toujours une décimale en km', () => {
    expect(l(formatDistance(2100))).toBe('2,1 km');
    expect(l(formatDistance(6000))).toBe('6,0 km');
    expect(l(formatDistance(2349))).toBe('2,3 km');
  });
});

describe('dates (La Réunion, UTC+4)', () => {
  it('donne le jour réunionnais, pas celui de Paris ou UTC', () => {
    // 29 oct. 2026 à 21 h UTC = 30 oct. 1 h à La Réunion
    const t = new Date(Date.UTC(2026, 9, 29, 21, 0));
    expect(aujourdhuiReunion(t)).toBe('2026-10-30');
    expect(minuteReunion(t)).toBe(60);
  });

  it('formate les dates de la maquette', () => {
    expect(l(jourCourt('2026-10-30'))).toBe('ven. 30');
    expect(dateLongue('2026-10-30')).toBe('Vendredi 30 octobre');
    expect(dateLongue('2026-11-01')).toBe('Dimanche 1er novembre');
  });

  it('propose les 3 cases du formulaire', () => {
    const c = choixDates('2026-10-30').map((x) => [x.libelle, l(x.valeur)]);
    expect(c).toEqual([
      ['Ce soir', 'ven. 30'],
      ['Demain', 'sam. 31'],
      ['Dimanche', '1er nov.'],
    ]);
  });
});

describe('quand a lieu la mission', () => {
  const jeudi = '2026-10-29';
  it.each([
    ['2026-10-29', 1080, 'ce soir'],
    ['2026-10-29', 690, "aujourd'hui"],
    ['2026-10-30', 1080, 'demain'],
    ['2026-10-31', 1080, 'samedi'],
    ['2026-11-04', 1080, 'mercredi'],
    ['2026-11-05', 1080, 'le 5 novembre'],
    ['2026-12-01', 1080, 'le 1er décembre'],
  ])('%s à %i min → %s', (jour, debut, attendu) => {
    expect(quandMission(jour, debut, jeudi)).toBe(attendu);
  });
});

describe('bornes d’une mission', () => {
  it('18 h – minuit le 30 octobre à La Réunion = 14 h – 20 h UTC', async () => {
    const { bornesMission } = await import('../src');
    const b = bornesMission('2026-10-30', 1080, 0);
    expect(new Date(b.debut).toISOString()).toBe('2026-10-30T14:00:00.000Z');
    expect(new Date(b.fin).toISOString()).toBe('2026-10-30T20:00:00.000Z');
  });
});

describe('heure tapée', () => {
  it.each([
    ['18:00', '18:00'],
    ['18h', '18:00'],
    ['18h30', '18:30'],
    ['1830', '18:30'],
    ['930', '09:30'],
    ['9:15', '09:15'],
    ['00:00', '00:00'],
    ['18', '18:00'],
    ['25:00', '25:00'],
    ['abc', 'abc'],
  ])('« %s » → « %s »', async (saisie, attendu) => {
    const { normaliserHeure } = await import('../src');
    expect(normaliserHeure(saisie)).toBe(attendu);
  });
});

describe('semaine du planning', () => {
  it('ramène chaque jour au lundi de sa semaine', async () => {
    const { lundiDeLaSemaine, joursDeLaSemaine } = await import('../src');
    expect(lundiDeLaSemaine('2026-10-30')).toBe('2026-10-26'); // vendredi
    expect(lundiDeLaSemaine('2026-11-01')).toBe('2026-10-26'); // dimanche
    expect(lundiDeLaSemaine('2026-10-26')).toBe('2026-10-26');
    expect(joursDeLaSemaine('2026-12-28')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });
});
