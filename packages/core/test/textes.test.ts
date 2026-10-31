import { describe, expect, it } from 'vitest';
import {
  aPropos,
  conditionsGenerales,
  confidentialite,
  cookies,
  mentionsLegales,
  questionsFrequentes,
  textesAcceptation,
  champsACompleter,
  confirmationExtra,
  detailCalculExtra,
  legendeBrut,
  legendeFrais,
  legendeListe,
  legendeSalaires,
  notificationConfirmation,
  questionDesistement,
  legendeAcces,
  textePrise,
  textes,
  LIBELLES_POSTE,
  textesEcrans,
  textesVitrine,
  montantsVitrine,
  LIBELLES_EXPERIENCE,
  LIBELLES_LANGUE,
} from '../src';
import { FRAIS, l, SMIC } from './aide';

function tousLesTextes(o: unknown): string[] {
  if (typeof o === 'string') return [o];
  if (typeof o === 'function') return [o(1), o(2)];
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
const corpus = [
  ...tousLesTextes(textes),
  ...tousLesTextes(textesEcrans),
  ...tousLesTextes(textesVitrine),
  ...tousLesTextes([mentionsLegales, conditionsGenerales, confidentialite, cookies, questionsFrequentes, aPropos, textesAcceptation]),
  ...tousLesTextes(montantsVitrine(1231, 2500)),
  ...tousLesTextes(LIBELLES_POSTE),
  ...tousLesTextes(LIBELLES_EXPERIENCE),
  ...tousLesTextes(LIBELLES_LANGUE),
  ...generes,
];

describe('règles d’écriture', () => {
  it('aucun point d’exclamation', () => {
    for (const t of corpus) expect(t, t).not.toContain('!');
  });
  it('aucun émoji', () => {
    // ©, ® et ™ sont « pictographiques » pour Unicode mais s'affichent en texte : ce ne sont pas des émojis.
    for (const t of corpus) expect(t, t).not.toMatch(/(?![©®™])\p{Extended_Pictographic}/u);
  });
  it('aucune mention d’âge', () => {
    // « ans de métier » : durée d'expérience, écrite ainsi pour ne jamais se lire comme un âge.
    for (const t of corpus) expect(t, t).not.toMatch(/\bjeunes?\b|étudiant|\d+\s*ans\b(?! de métier)|\d+-\d+ ans/i);
  });
  it('aucune forme genrée retirée', () => {
    for (const t of corpus) expect(t, t).not.toMatch(/Empêché|prévenu dès|Il arrive|Serveur|Barman/);
  });
  it('aucun accord au masculin sur la personne (venu, absent, inscrit, prêt…)', () => {
    // « Extra absent et non remplacé » : texte validé de la maquette, « un extra » y désigne le poste.
    // « Le contrat est prêt » : c'est le contrat qui est prêt, pas une personne.
    const corpusPersonne = corpus.map((t) => t.replace('Extra absent et non remplacé', '').replace('Le contrat est prêt', ''));
    for (const t of corpusPersonne)
      expect(t, t).not.toMatch(/(?<!\p{L})(venu|absent|inscrit|prêt|connecté|déclaré|payé par toi)(?!\p{L})/iu);
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

describe('textes selon le jour de la mission', () => {
  it('confirmation', () => {
    expect(l(confirmationExtra(1080, 'ce soir'))).toBe("C'est confirmé. On t'attend à 18 h.");
    expect(l(confirmationExtra(690, "aujourd'hui"))).toBe("C'est confirmé. On t'attend à 11 h 30.");
    expect(l(confirmationExtra(1080, 'demain'))).toBe("C'est confirmé. On t'attend demain à 18 h.");
    expect(l(confirmationExtra(1080, 'samedi'))).toBe("C'est confirmé. On t'attend samedi à 18 h.");
  });
  it('mission déjà prise', () => {
    expect(textePrise(2, 'demain')).toBe("Quelqu'un a répondu avant toi. 2 missions t'attendent encore demain.");
  });
  it('désistement', () => {
    expect(l(questionDesistement('samedi'))).toBe('Tu ne viens plus samedi ?');
  });
  it('accès', () => {
    expect(legendeAcces('2,1 km', 'entrée du personnel côté cuisine')).toBe('2,1 km · entrée du personnel côté cuisine');
    expect(legendeAcces('2,1 km', null)).toBe('2,1 km');
  });
});

describe('page d’accueil', () => {
  it('calcule les montants depuis les paramètres (6 h au SMIC 2026)', () => {
    const m = montantsVitrine(SMIC, FRAIS);
    expect(l(m.taux)).toBe('12,31 €');
    expect(l(m.brut)).toBe('81,25 €');
    expect(l(m.net)).toBe('63 €');
    expect(l(m.fraisCourt)).toBe('25 € HT');
    expect(l(m.fraisDetail)).toBe('25,00 € HT');
    expect(l(m.detailSalaire)).toBe('6 h × 12,31 € + 10 % de congés payés. Versé par vous, hors charges patronales.');
  });
  it('suit le taux en vigueur', () => {
    expect(l(montantsVitrine(1300, 2500).brut)).toBe('85,80 €');
  });
  it('reprend les textes de la maquette', () => {
    expect(l(textesVitrine.promesse.titre)).toBe("Un extra pour aujourd'hui, environ 20 % moins cher que l'intérim.");
    expect(l(textesVitrine.promesse.confirmation)).toBe('Kévin a dit mi lé la. Arrivée prévue à 18 h.');
    expect(textesVitrine.pied.signature).toBe('Les extras péi, près de chez vous.');
  });
});
