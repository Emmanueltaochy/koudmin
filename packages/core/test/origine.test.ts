import { describe, expect, it } from 'vitest';
import { decoderOrigine, encoderOrigine, lireOrigine, resumeOrigine } from '../src';

const LE = new Date('2026-11-15T10:00:00Z');

describe('origine des inscrits', () => {
  it('note le site d’origine, la page d’arrivée et une campagne', () => {
    expect(lireOrigine('https://kivien.re/extras?x=1', 'https://www.google.com/', LE)).toEqual({
      referent: 'google.com',
      page: '/extras',
      utm: null,
      le: '2026-11-15T10:00:00.000Z',
    });
    expect(
      lireOrigine(
        'https://kivien.re/pro?utm_source=facebook&utm_medium=pub&utm_campaign=lancement',
        '',
        LE,
      )?.utm,
    ).toBe('facebook / pub / lancement');
  });
  it('un passage d’une page Kivien à l’autre n’est pas une origine', () => {
    expect(
      lireOrigine('https://app.kivien.re/bienvenue', 'https://kivien.re/extras', LE)?.referent,
    ).toBeNull();
  });
  it('passe du site à l’app dans le lien, et refuse un texte trafiqué', () => {
    const o = lireOrigine('https://kivien.re/extras', 'https://l.facebook.com/', LE)!;
    expect(decoderOrigine(encoderOrigine(o))).toEqual(o);
    expect(decoderOrigine('n%27importe%20quoi')).toBeNull();
    expect(
      decoderOrigine(
        encodeURIComponent(JSON.stringify([null, 'javascript:x', null, LE.toISOString()])),
      ),
    ).toBeNull();
  });
  it('résume l’origine pour l’admin', () => {
    expect(resumeOrigine({ referent: 'google.re', page: '/extras', utm: null })).toBe(
      'Google · /extras',
    );
    expect(resumeOrigine({ referent: 'l.facebook.com', page: '/', utm: null })).toBe(
      'Facebook · /',
    );
    expect(resumeOrigine({ referent: null, page: '/', utm: null })).toBe('Accès direct · /');
    expect(resumeOrigine({ referent: null, page: '/pro', utm: 'facebook / pub' })).toBe(
      'facebook / pub · /pro',
    );
    expect(resumeOrigine(null)).toBe('–');
  });
});
