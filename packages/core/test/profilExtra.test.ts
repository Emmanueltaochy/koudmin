import { describe, expect, it } from 'vitest';
import {
  caracteresRestants,
  initiales,
  normaliserPresentation,
  PRESENTATION_MAX,
  resumeProfil,
  trierCompetences,
} from '../src';

describe('profil public de l’extra', () => {
  it('résume compétences, expérience et langues dans un ordre stable', () => {
    expect(resumeProfil({ competences: ['barman', 'serveur'], experience: '1_3_ans', langues: ['creole', 'francais'] })).toBe(
      'Salle, Bar · De 1 à 3 ans de métier · Français, Créole',
    );
    expect(resumeProfil({ competences: [], experience: null, langues: [] })).toBe('');
    expect(resumeProfil({ competences: ['plonge'], experience: null, langues: [] })).toBe('Plonge');
    expect(trierCompetences(['reception', 'commis', 'serveur'])).toEqual(['serveur', 'commis', 'reception']);
  });
  it('limite la présentation à 280 caractères, espaces superflus retirés', () => {
    expect(normaliserPresentation('  Deux   saisons\n\n\n\nen salle.  ')).toBe('Deux saisons\n\nen salle.');
    expect(caracteresRestants('a'.repeat(PRESENTATION_MAX))).toBe(0);
    expect(caracteresRestants('a'.repeat(PRESENTATION_MAX + 1))).toBe(-1);
    expect(caracteresRestants('é'.repeat(10))).toBe(270);
  });
  it('calcule les initiales de l’avatar', () => {
    expect(initiales('Kévin', 'Hoarau')).toBe('KH');
    expect(initiales('élodie', '')).toBe('É');
  });
});
