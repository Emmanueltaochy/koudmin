import { describe, expect, it } from 'vitest';
import {
  champsACompleter,
  confirmationExtra,
  detailCalculExtra,
  legendeBrut,
  legendeFrais,
  legendeListe,
  legendeSalaires,
  notificationConfirmation,
  questionDesistement,
  textePrise,
  textes,
  LIBELLES_POSTE,
} from '../src';
import { FRAIS, l, SMIC } from './aide';

function tousLesTextes(o: unknown): string[] {
  if (typeof o === 'string') return [o];
  if (o && typeof o === 'object') return Object.values(o).flatMap(tousLesTextes);
  return [];
}

const generes = [
  legendeListe(4, true),
  legendeBrut(8125),
  detailCalculExtra(360, SMIC),
  legendeSalaires(2, 360, SMIC),
  legendeSalaires(1, 360, SMIC),
  legendeFrais(2, FRAIS),
  champsACompleter(2),
  confirmationExtra(1080),
  notificationConfirmation('Kévin', 1080),
  textePrise(3),
  textePrise(1),
  questionDesistement('ce soir'),
];
const corpus = [...tousLesTextes(textes), ...tousLesTextes(LIBELLES_POSTE), ...generes];

describe('règles d’écriture', () => {
  it('aucun point d’exclamation', () => {
    for (const t of corpus) expect(t, t).not.toContain('!');
  });
  it('aucun émoji', () => {
    for (const t of corpus) expect(t, t).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('aucune mention d’âge', () => {
    for (const t of corpus) expect(t, t).not.toMatch(/\bjeunes?\b|étudiant|\d+\s*ans\b|\d+-\d+ ans/i);
  });
  it('aucune forme genrée retirée', () => {
    for (const t of corpus) expect(t, t).not.toMatch(/Empêché|prévenu dès|Il arrive|Serveur|Barman/);
  });
});

describe('textes calculés (README)', () => {
  it('reprend les textes de la maquette', () => {
    expect(legendeListe(4, true)).toBe('4 missions près de toi · retour assuré en premier');
    expect(legendeListe(1, false)).toBe('1 mission près de toi');
    expect(l(legendeBrut(8125))).toBe('81,25 € brut, congés payés compris');
    expect(l(detailCalculExtra(360, SMIC))).toBe('6 h × 12,31 € brut. Payé par le restaurant.');
    expect(l(legendeSalaires(2, 360, SMIC))).toBe(
      '2 × 6 h × 12,31 €, + 10 % de congés payés. Versés par vous aux extras, hors charges patronales.',
    );
    expect(l(legendeFrais(2, FRAIS))).toBe('2 × 25 € HT. Extra absent et non remplacé : non facturé.');
    expect(champsACompleter(2)).toBe('2 champs à compléter.');
    expect(champsACompleter(1)).toBe('1 champ à compléter.');
    expect(l(confirmationExtra(1080))).toBe("C'est confirmé. On t'attend à 18 h.");
    expect(l(questionDesistement('ce soir'))).toBe('Tu ne viens plus ce soir ?');
  });

  it('applique les textes neutres validés', () => {
    expect(l(notificationConfirmation('Kévin', 1080))).toBe('Kévin a dit mi lé la. Arrivée prévue à 18 h.');
    expect(textes.extra.missions.videTexte).toBe(
      "Coche tes soirées libres. On te prévient dès qu'un restaurant a besoin de toi.",
    );
    expect(l(textes.extra.detail.regleAbsence)).toBe(
      'Un empêchement ? Préviens au moins 4 h avant. Une absence sans prévenir = exclusion.',
    );
  });

  it('accorde le nombre de missions restantes', () => {
    expect(textePrise(3)).toBe("Quelqu'un a répondu avant toi. 3 missions t'attendent encore ce soir.");
    expect(textePrise(1)).toBe("Quelqu'un a répondu avant toi. 1 mission t'attend encore ce soir.");
    expect(textePrise(0)).toBe("Quelqu'un a répondu avant toi.");
  });
});
