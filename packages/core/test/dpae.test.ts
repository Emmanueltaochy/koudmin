import { describe, expect, it } from 'vitest';
import {
  codeApeValide,
  normaliserCodeApe,
  normaliserServiceSante,
  serviceSanteValide,
  validerMandatDpae,
  vueDpae,
  type EtatDpae,
} from '../src';

const etat = (e: Partial<EtatDpae>): EtatDpae => ({
  ouverte: true,
  mandat: true,
  prevue: false,
  statut: null,
  motif: null,
  reference: null,
  envoyeeLe: null,
  ...e,
});

describe('DPAE automatique', () => {
  it('normalise et contrôle le code APE', () => {
    expect(normaliserCodeApe(' 56.10a ')).toBe('5610A');
    expect(codeApeValide('56.10A')).toBe(true);
    expect(codeApeValide('5610')).toBe(false);
    expect(codeApeValide('A5610')).toBe(false);
  });

  it('normalise et contrôle le code du service de santé au travail', () => {
    expect(normaliserServiceSante(' mt 974 ')).toBe('MT974');
    expect(serviceSanteValide('MT974')).toBe(true);
    expect(serviceSanteValide('')).toBe(false);
    expect(serviceSanteValide('SISTBI-LE-PORT')).toBe(false);
  });

  it('demande le code APE, le service de santé et l’accord', () => {
    expect(
      Object.keys(validerMandatDpae({ codeApe: '', serviceSante: '', accord: false })),
    ).toEqual(['codeApe', 'serviceSante', 'accord']);
    expect(validerMandatDpae({ codeApe: '5610A', serviceSante: 'MT974', accord: true })).toEqual(
      {},
    );
  });

  it('choisit ce que voit l’établissement', () => {
    // Envoi automatique fermé, ou embauche d'avant le mandat : comme avant, à la main.
    expect(vueDpae(null)).toBe('manuelle');
    expect(vueDpae(etat({ ouverte: false }))).toBe('manuelle');
    expect(vueDpae(etat({}))).toBe('manuelle');
    // Ouvert sans mandat : on le propose.
    expect(vueDpae(etat({ mandat: false }))).toBe('proposer');
    // Kivien s'en charge.
    expect(vueDpae(etat({ prevue: true }))).toBe('attente');
    expect(vueDpae(etat({ statut: 'a_envoyer' }))).toBe('attente');
    expect(vueDpae(etat({ statut: 'envoyee' }))).toBe('envoyee');
    expect(vueDpae(etat({ statut: 'acceptee' }))).toBe('faite');
    // Refus de l'Urssaf ou envoi impossible : l'établissement reprend la main.
    expect(vueDpae(etat({ statut: 'refusee' }))).toBe('a_reprendre');
    expect(vueDpae(etat({ statut: 'a_faire' }))).toBe('a_reprendre');
    expect(vueDpae(etat({ statut: 'a_annuler' }))).toBe('a_annuler');
  });
});
