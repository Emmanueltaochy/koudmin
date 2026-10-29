import { describe, expect, it } from 'vitest';
import {
  etiquetteJour,
  filtrerMissions,
  ligneRetour,
  trierMissions,
  type MissionResume,
} from '../src';
import { l, SMIC } from './aide';

const base = { tauxHoraireBrutCentimes: SMIC };
const missions: MissionResume[] = [
  { ...base, id: 'filaos', restaurant: 'Hôtel Les Filaos', commune: "L'Hermitage", distanceMetres: 6000, poste: 'commis', jour: '2026-10-31', debut: 690, fin: 900, retourAssure: false, busRetour: 920 },
  { ...base, id: 'tatie', restaurant: 'Chez Tatie Lucette', commune: 'Saint-Paul', distanceMetres: 4800, poste: 'plonge', jour: '2026-10-30', debut: 1140, fin: 1410, retourAssure: false, busRetour: 1215 },
  { ...base, id: 'tikaz', restaurant: 'Ti Kaz Bar', commune: 'Saint-Gilles-les-Bains', distanceMetres: 2300, poste: 'barman', jour: '2026-10-31', debut: 1080, fin: 60, retourAssure: true, busRetour: null },
  { ...base, id: 'boucan', restaurant: 'Le Boucan Grillé', commune: 'Saint-Gilles-les-Bains', distanceMetres: 2100, poste: 'serveur', jour: '2026-10-30', debut: 1080, fin: 0, retourAssure: true, busRetour: null },
];

describe('tri des missions', () => {
  it('sans voiture : retour assuré d’abord, puis distance (ordre de la maquette)', () => {
    expect(trierMissions(missions, { aVoiture: false }).map((m) => m.id)).toEqual([
      'boucan', 'tikaz', 'tatie', 'filaos',
    ]);
  });

  it('avec voiture : distance seule', () => {
    const avecRetourLoin = [...missions, { ...missions[3]!, id: 'loin', distanceMetres: 9000 }];
    expect(trierMissions(avecRetourLoin, { aVoiture: true }).map((m) => m.id)).toEqual([
      'boucan', 'tikaz', 'tatie', 'filaos', 'loin',
    ]);
  });

  it('ne modifie pas la liste d’origine', () => {
    const copie = [...missions];
    trierMissions(missions, { aVoiture: false });
    expect(missions).toEqual(copie);
  });
});

describe('filtres', () => {
  it('« Ce soir » garde les missions du jour', () => {
    expect(filtrerMissions(missions, 'ceSoir', '2026-10-30').map((m) => m.id).sort()).toEqual(['boucan', 'tatie']);
  });
  it('« Week-end » garde vendredi, samedi et dimanche', () => {
    const lundi = { ...missions[0]!, id: 'lundi', jour: '2026-11-02' };
    expect(filtrerMissions([...missions, lundi], 'weekEnd', '2026-10-29')).toHaveLength(4);
  });
});

describe('cartes', () => {
  it('badge « Ce soir » le jour même, sinon le jour court', () => {
    expect(etiquetteJour('2026-10-30', 1080, '2026-10-30')).toEqual({ urgent: true, texte: 'Ce soir' });
    expect(etiquetteJour('2026-10-30', 690, '2026-10-30')).toEqual({ urgent: true, texte: "Aujourd'hui" });
    const r = etiquetteJour('2026-10-31', 1080, '2026-10-30');
    expect(r.urgent).toBe(false);
    expect(l(r.texte)).toBe('sam. 31');
  });

  it('ligne retour : assuré, dernier bus avant la fin, bus après la fin', () => {
    const p = { aVoiture: false };
    const [filaos, tatie, , boucan] = missions;
    expect(ligneRetour(boucan!, p)).toEqual({ type: 'assure', texte: 'Retour assuré par le restaurant' });
    expect(l((ligneRetour(tatie!, p) as { texte: string }).texte)).toBe('Dernier bus 20 h 15 : retour à prévoir');
    expect(l((ligneRetour(filaos!, p) as { texte: string }).texte)).toBe('Bus retour à 15 h 20');
    expect(ligneRetour(boucan!, { aVoiture: true })).toEqual({ type: 'aucune' });
  });
});
