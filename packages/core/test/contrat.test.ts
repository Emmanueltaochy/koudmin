import { describe, expect, it } from 'vitest';
import { nirValide, redigerContrat } from '../src';
import { l, SMIC } from './aide';

const contrat = redigerContrat({
  employeur: { nom: 'Le Boucan Grillé', adresse: '14 rue du Général de Gaulle, 97434 Saint-Gilles-les-Bains', siret: null },
  salarie: { prenom: 'Kévin', nom: 'Hoarau', dateNaissance: '2001-05-12', lieuNaissance: 'Saint-Paul', adresse: null },
  poste: 'serveur',
  jour: '2026-10-30',
  debut: 1080,
  fin: 0,
  tauxHoraireBrutCentimes: SMIC,
  adresseService: '14 rue du Général de Gaulle, 97434 Saint-Gilles-les-Bains',
});
const texte = l(contrat.articles.map((a) => `${a.titre} ${a.texte}`).join('\n'));

describe('contrat d’extra', () => {
  it('reprend les données de la demande et le calcul du salaire', () => {
    expect(texte).toContain('Le Boucan Grillé');
    expect(texte).toContain('Kévin Hoarau, né·e le 12 mai 2001 à Saint-Paul');
    expect(texte).toContain('Le vendredi 30 octobre, de 18 h à minuit, soit 6 h');
    expect(texte).toContain('Taux horaire brut : 12,31 €');
    expect(texte).toContain('Salaire brut : 73,86 €');
    expect(texte).toContain('soit 81,25 € brut');
  });
  it('cite le motif du CDD d’usage et l’absence de prime de précarité', () => {
    expect(texte).toContain('L1242-2 3°');
    expect(texte).toContain('L1243-10');
    expect(texte).toContain('IDCC 1979');
  });
  it('reprend l’intitulé et la description d’un poste libre', () => {
    const libre = redigerContrat({
      employeur: { nom: 'Le Boucan Grillé', adresse: '14 rue du Général de Gaulle', siret: null },
      salarie: { prenom: 'Kévin', nom: 'Hoarau', dateNaissance: null, lieuNaissance: null, adresse: null },
      poste: 'autre',
      intitule: 'Voiturier',
      descriptionPoste: 'Accueil des clients et stationnement des véhicules.',
      jour: '2026-10-30',
      debut: 1080,
      fin: 0,
      tauxHoraireBrutCentimes: SMIC,
      adresseService: '14 rue du Général de Gaulle',
    });
    const emploi = libre.articles.find((a) => a.titre === 'Emploi')!.texte;
    expect(emploi).toBe('Voiturier. Accueil des clients et stationnement des véhicules. Lieu de travail : 14 rue du Général de Gaulle.');
  });
  it('ne contient ni « ! » ni mention d’âge', () => {
    expect(texte).not.toContain('!');
    expect(texte).not.toMatch(/\d+ ans/);
  });
});

describe('numéro de sécurité sociale', () => {
  it('vérifie la clé', () => {
    // 1 01 05 974 151 234 : clé = 97 - (1010597415123 mod 97)
    const corps = '1010597415123';
    const cle = String(97 - Number(BigInt(corps) % 97n)).padStart(2, '0');
    expect(nirValide(corps + cle)).toBe(true);
    expect(nirValide(`${corps.slice(0, 1)} ${corps.slice(1, 3)} ${corps.slice(3, 5)} ${corps.slice(5)} ${cle}`)).toBe(true);
    expect(nirValide(corps + (cle === '01' ? '02' : '01'))).toBe(false);
    expect(nirValide('123')).toBe(false);
  });
});
