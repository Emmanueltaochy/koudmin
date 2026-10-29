import { ajouterJours, aujourdhuiReunion, type MissionResume } from '@koudmin/core';
import type { LieuMission, MissionDetail, Profil, SourceDonnees } from './source';

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

const COMPLEMENTS: Record<string, { tenue: string; lieu: LieuMission }> = {
  d001: { tenue: 'Tenue noire. Chaussures fermées.', lieu: { adresse: '14 rue du Général de Gaulle', codePostal: '97434', acces: 'entrée du personnel côté cuisine', telephone: '+262262000001', lat: -21.039442, lng: 55.237476 } },
  d002: { tenue: 'Tenue noire.', lieu: { adresse: '3 rue des Brisants', codePostal: '97434', acces: null, telephone: '+262262000002', lat: -21.044625, lng: 55.239329 } },
  d003: { tenue: 'Chaussures fermées.', lieu: { adresse: '22 rue Labourdonnais', codePostal: '97460', acces: null, telephone: '+262262000003', lat: -20.989435, lng: 55.270813 } },
  d004: { tenue: 'Tenue blanche.', lieu: { adresse: '5 avenue de la Mer', codePostal: '97434', acces: null, telephone: '+262262000004', lat: -21.080704, lng: 55.235221 } },
};

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sourceFictive(): SourceDonnees {
  // Missions confirmées par l'extra de démo, gardées en mémoire le temps de la session.
  const confirmees = new Set<string>();
  const ecouteurs = new Set<() => void>();
  const prevenir = () => ecouteurs.forEach((f) => f());

  return {
    async profil(): Promise<Profil> {
      return { prenom: 'Kévin', commune: 'Saint-Paul', aVoiture: false };
    },
    async missions() {
      await attendre(700);
      return missionsFictives().filter((m) => !confirmees.has(m.id));
    },
    async detail(id): Promise<MissionDetail | null> {
      await attendre(200);
      const m = missionsFictives().find((x) => x.id === id);
      const c = COMPLEMENTS[id];
      if (!m || !c) return null;
      const confirmee = confirmees.has(id);
      return { ...m, tenue: c.tenue, confirmee, disponible: !confirmee, lieu: confirmee ? c.lieu : null };
    },
    async accepter(id) {
      // Délai de la maquette : le temps de voir « On prévient le restaurant ».
      await attendre(1400);
      confirmees.add(id);
      prevenir();
      return 'confirmee';
    },
    async seDesister(id) {
      await attendre(900);
      confirmees.delete(id);
      prevenir();
    },
    ecouterMissions(rappel) {
      ecouteurs.add(rappel);
      return () => {
        ecouteurs.delete(rappel);
      };
    },
  };
}
