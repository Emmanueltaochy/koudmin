import { describe, expect, it } from 'vitest';
import { etatInitial, transitionMission as t, type EtatMission, type EvenementMission } from '../src';

const suite = (...evs: EvenementMission['type'][]): EtatMission =>
  evs.reduce<EtatMission>((e, type) => t(e, { type } as EvenementMission), etatInitial);

describe('machine d’états « Mi lé la »', () => {
  it('idle → sending → done', () => {
    expect(suite('ACCEPTER')).toEqual({ nom: 'sending' });
    expect(suite('ACCEPTER', 'CONFIRMEE')).toEqual({ nom: 'done' });
  });

  it('sending → taken si un autre extra a été plus rapide', () => {
    expect(suite('ACCEPTER', 'DEJA_PRISE')).toEqual({ nom: 'taken' });
  });

  it('ignore un double appui pendant l’envoi', () => {
    expect(suite('ACCEPTER', 'ACCEPTER')).toEqual({ nom: 'sending' });
  });

  it('revient en idle sur échec réseau, pour réessayer', () => {
    expect(suite('ACCEPTER', 'ECHEC_RESEAU')).toEqual({ nom: 'idle', erreurReseau: true });
    expect(suite('ACCEPTER', 'ECHEC_RESEAU', 'ACCEPTER')).toEqual({ nom: 'sending' });
  });

  it('désistement depuis done : Annuler revient à done, Confirmer libère', () => {
    expect(suite('ACCEPTER', 'CONFIRMEE', 'DESISTER')).toEqual({ nom: 'cancel', precedent: 'done' });
    expect(suite('ACCEPTER', 'CONFIRMEE', 'DESISTER', 'ANNULER')).toEqual({ nom: 'done' });
    expect(suite('ACCEPTER', 'CONFIRMEE', 'DESISTER', 'CONFIRMER_DESISTEMENT')).toEqual({ nom: 'liberee' });
  });

  it('désistement depuis idle : Annuler revient à idle', () => {
    expect(suite('DESISTER', 'ANNULER')).toEqual({ nom: 'idle' });
  });

  it('pas de désistement pendant l’envoi ni après une mission prise', () => {
    expect(suite('ACCEPTER', 'DESISTER')).toEqual({ nom: 'sending' });
    expect(suite('ACCEPTER', 'DEJA_PRISE', 'DESISTER')).toEqual({ nom: 'taken' });
  });
});
