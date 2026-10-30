import { describe, expect, it } from 'vitest';
import {
  champsACompleter,
  lireMontant,
  montantSaisie,
  saisieParDefaut,
  validerDemande,
  type SaisieDemande,
} from '../src';
import { l, SMIC } from './aide';

const maintenant = { jour: '2026-10-29', minute: 14 * 60 };
const valide = (): SaisieDemande => ({
  ...saisieParDefaut('2026-10-29', SMIC),
  adresse: '14 rue du Général de Gaulle, Saint-Gilles-les-Bains',
});

describe('montants saisis', () => {
  it.each([
    ['12,31', 1231],
    ['12.31', 1231],
    ['12,3', 1230],
    ['12', 1200],
    ['12,31 €', 1231],
    [' 13,50 ', 1350],
  ])('« %s » → %i', (s, c) => expect(lireMontant(s)).toBe(c));
  it.each(['', 'abc', '12,345', '-12', '12,31,2'])('refuse « %s »', (s) => expect(lireMontant(s)).toBeNull());
  it('préremplit au format français', () => expect(montantSaisie(1231)).toBe('12,31'));
});

describe('validation de la demande', () => {
  it('par défaut : ce soir, 18 h – minuit, SMIC, case retour décochée, adresse à remplir', () => {
    const s = saisieParDefaut('2026-10-29', SMIC);
    expect(s.retourAssure).toBe(false);
    expect([s.jour, s.debut, s.fin, s.taux]).toEqual(['2026-10-29', '18:00', '00:00', '12,31']);
    expect(validerDemande(s, SMIC, maintenant)).toEqual({ adresse: "Indiquez l'adresse du service." });
  });

  it('accepte une demande complète', () => {
    expect(validerDemande(valide(), SMIC, maintenant)).toEqual({});
  });

  it('refuse un taux sous le SMIC, accepte au-dessus', () => {
    expect(l(validerDemande({ ...valide(), taux: '12,30' }, SMIC, maintenant).taux!)).toBe(
      "Minimum légal : 12,31 € de l'heure.",
    );
    expect(validerDemande({ ...valide(), taux: '14' }, SMIC, maintenant).taux).toBeUndefined();
    expect(validerDemande({ ...valide(), taux: 'douze' }, SMIC, maintenant).taux).toBeDefined();
  });

  it('refuse un horaire déjà commencé ce jour-là, accepte le lendemain', () => {
    const tard = { jour: '2026-10-29', minute: 19 * 60 };
    expect(validerDemande(valide(), SMIC, tard).horaires).toBe('Cet horaire est déjà passé.');
    expect(validerDemande({ ...valide(), jour: '2026-10-30' }, SMIC, tard).horaires).toBeUndefined();
  });

  it('refuse début = fin et les heures illisibles', () => {
    expect(validerDemande({ ...valide(), fin: '18:00' }, SMIC, maintenant).horaires).toBeDefined();
    expect(validerDemande({ ...valide(), debut: '' }, SMIC, maintenant).horaires).toBeDefined();
  });

  it('compte les champs à compléter pour le résumé', () => {
    const e = validerDemande({ ...valide(), poste: null, adresse: '  ' }, SMIC, maintenant);
    expect(Object.keys(e)).toEqual(['poste', 'adresse']);
    expect(champsACompleter(Object.keys(e).length)).toBe('2 champs à compléter.');
  });

  it('poste libre : intitulé obligatoire, description facultative et bornée', () => {
    const libre = { ...valide(), poste: 'autre' as const };
    expect(validerDemande(libre, SMIC, maintenant).intitule).toBe('Indiquez le poste.');
    expect(validerDemande({ ...libre, intitule: 'Voiturier' }, SMIC, maintenant)).toEqual({});
    expect(validerDemande({ ...libre, intitule: 'x'.repeat(61) }, SMIC, maintenant).intitule).toBeDefined();
    expect(validerDemande({ ...libre, intitule: 'Voiturier', descriptionPoste: 'x'.repeat(501) }, SMIC, maintenant).descriptionPoste).toBeDefined();
    // Poste de la liste : l'intitulé n'est pas demandé.
    expect(validerDemande({ ...valide(), intitule: '' }, SMIC, maintenant).intitule).toBeUndefined();
  });

  it('borne le nombre d’extras et les consignes', () => {
    expect(validerDemande({ ...valide(), nbExtras: 0 }, SMIC, maintenant).nbExtras).toBeDefined();
    expect(validerDemande({ ...valide(), nbExtras: 11 }, SMIC, maintenant).nbExtras).toBeDefined();
    expect(validerDemande({ ...valide(), consignes: 'x'.repeat(501) }, SMIC, maintenant).consignes).toBeDefined();
  });
});
