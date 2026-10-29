import { describe, expect, it } from 'vitest';
import {
  etatDepuisServeur,
  etatInitial,
  transitionMission as t,
  type EtatMission,
  type EvenementMission,
} from '../src';

const suite = (depart: EtatMission, ...evs: EvenementMission['type'][]): EtatMission =>
  evs.reduce<EtatMission>((e, type) => t(e, { type } as EvenementMission), depart);
const depuisIdle = (...evs: EvenementMission['type'][]) => suite(etatInitial, ...evs);

describe('machine d’états « Mi lé la »', () => {
  it('idle → sending → done', () => {
    expect(depuisIdle('ACCEPTER')).toEqual({ nom: 'sending' });
    expect(depuisIdle('ACCEPTER', 'CONFIRMEE')).toEqual({ nom: 'done' });
  });

  it('sending → taken si un autre extra a été plus rapide', () => {
    expect(depuisIdle('ACCEPTER', 'DEJA_PRISE')).toEqual({ nom: 'taken' });
  });

  it('ignore un double appui pendant l’envoi', () => {
    expect(depuisIdle('ACCEPTER', 'ACCEPTER')).toEqual({ nom: 'sending' });
  });

  it('revient en idle sur échec réseau, pour réessayer', () => {
    expect(depuisIdle('ACCEPTER', 'ECHEC_RESEAU')).toEqual({ nom: 'idle', erreurReseau: true });
    expect(depuisIdle('ACCEPTER', 'ECHEC_RESEAU', 'ACCEPTER')).toEqual({ nom: 'sending' });
  });

  it('désistement : Annuler revient à done', () => {
    expect(depuisIdle('ACCEPTER', 'CONFIRMEE', 'DESISTER')).toEqual({ nom: 'cancel' });
    expect(depuisIdle('ACCEPTER', 'CONFIRMEE', 'DESISTER', 'ANNULER')).toEqual({ nom: 'done' });
  });

  it('désistement : Confirmer envoie, puis libère la mission', () => {
    const done = { nom: 'done' } as const;
    expect(suite(done, 'DESISTER', 'CONFIRMER_DESISTEMENT')).toEqual({ nom: 'liberation' });
    expect(suite(done, 'DESISTER', 'CONFIRMER_DESISTEMENT', 'LIBEREE')).toEqual({ nom: 'liberee' });
  });

  it('désistement : échec réseau, retour à l’écran de désistement pour réessayer', () => {
    const done = { nom: 'done' } as const;
    expect(suite(done, 'DESISTER', 'CONFIRMER_DESISTEMENT', 'ECHEC_RESEAU')).toEqual({
      nom: 'cancel',
      erreurReseau: true,
    });
    expect(suite(done, 'DESISTER', 'CONFIRMER_DESISTEMENT', 'ECHEC_RESEAU', 'ANNULER')).toEqual(done);
  });

  it('pas de désistement avant confirmation, pendant l’envoi, ni après une mission prise', () => {
    expect(depuisIdle('DESISTER')).toEqual({ nom: 'idle' });
    expect(depuisIdle('ACCEPTER', 'DESISTER')).toEqual({ nom: 'sending' });
    expect(depuisIdle('ACCEPTER', 'DEJA_PRISE', 'DESISTER')).toEqual({ nom: 'taken' });
  });

  it('pas de double désistement pendant l’envoi', () => {
    expect(suite({ nom: 'done' }, 'DESISTER', 'CONFIRMER_DESISTEMENT', 'ANNULER')).toEqual({
      nom: 'liberation',
    });
  });

  it('part de l’état connu du serveur', () => {
    expect(etatDepuisServeur({ confirmee: true, disponible: false })).toEqual({ nom: 'done' });
    expect(etatDepuisServeur({ confirmee: false, disponible: false })).toEqual({ nom: 'taken' });
    expect(etatDepuisServeur({ confirmee: false, disponible: true })).toEqual({ nom: 'idle' });
  });
});
