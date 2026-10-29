import { ajouterJours, aujourdhuiReunion, type MissionResume } from '@koudmin/core';
import type { Profil, SourceDonnees } from './source';

/** Mêmes données que supabase/seed.sql. Le taux vient des paramètres fictifs, pas du code métier. */
const TAUX_FICTIF = 1231;

function missionsFictives(): MissionResume[] {
  const ceSoir = aujourdhuiReunion();
  const demain = ajouterJours(ceSoir, 1);
  const base = { tauxHoraireBrutCentimes: TAUX_FICTIF };
  return [
    { ...base, id: 'd001', restaurant: 'Le Boucan Grillé', commune: 'Saint-Gilles-les-Bains', distanceMetres: 2100, poste: 'serveur', jour: ceSoir, debut: 1080, fin: 0, retourAssure: true, busRetour: null },
    { ...base, id: 'd002', restaurant: 'Ti Kaz Bar', commune: 'Saint-Gilles-les-Bains', distanceMetres: 2300, poste: 'barman', jour: demain, debut: 1080, fin: 60, retourAssure: true, busRetour: null },
    { ...base, id: 'd003', restaurant: 'Chez Tatie Lucette', commune: 'Saint-Paul', distanceMetres: 4800, poste: 'plonge', jour: ceSoir, debut: 1140, fin: 1410, retourAssure: false, busRetour: 1215 },
    { ...base, id: 'd004', restaurant: 'Hôtel Les Filaos', commune: "L'Hermitage", distanceMetres: 6000, poste: 'commis', jour: demain, debut: 690, fin: 900, retourAssure: false, busRetour: 920 },
  ];
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sourceFictive(options: { vide?: boolean } = {}): SourceDonnees {
  return {
    async profil(): Promise<Profil> {
      return { prenom: 'Kévin', commune: 'Saint-Paul', aVoiture: false };
    },
    async missions() {
      await attendre(700);
      return options.vide ? [] : missionsFictives();
    },
    ecouterMissions() {
      return () => {};
    },
  };
}
