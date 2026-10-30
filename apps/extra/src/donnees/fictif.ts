import { ajouterJours, aujourdhuiReunion, SECTEUR_PAR_DEFAUT, type MissionResume } from '@kivien/core';
import type {
  CleDispo,
  ContratExtra,
  InfosContrat,
  LieuMission,
  MissionConfirmee,
  MissionDetail,
  Profil,
  SourceDonnees,
} from './source';

/** Mêmes données que supabase/seed.sql. Le taux vient des paramètres fictifs, pas du code métier. */
const TAUX_FICTIF = 1231;
/** Mot de passe accepté en démonstration. Un numéro se terminant par 01 a déjà un compte. */
const MOT_DE_PASSE_DEMO = 'kivien974';

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

/** Démonstration : adresse e-mail du compte. */
let emailDemo: { email: string | null; enAttente: string | null } = { email: null, enAttente: null };

export function sourceFictive(): SourceDonnees {
  // État de la démo, gardé en mémoire le temps de la session.
  const confirmees = new Set<string>();
  const signes = new Set<string>();
  const imagesSignees = new Map<string, { image: string; le: string }>();
  const dispos = new Set<CleDispo>([`${ajouterJours(aujourdhuiReunion(), 1)}:soir` as CleDispo]);
  let infos: InfosContrat | null = null;
  let profil: Profil = {
    prenom: 'Kévin',
    nom: 'Hoarau',
    telephone: '+262692000001',
    commune: 'Saint-Paul',
    aVoiture: false,
    competences: ['serveur'],
    experience: '1_3_ans',
    langues: ['francais', 'creole'],
    presentation: 'Deux saisons en salle à Saint-Gilles.',
  };
  let photo: string | null = null;
  const ecouteurs = new Set<() => void>();
  const prevenir = () => ecouteurs.forEach((f) => f());

  return {
    async profil() {
      return profil;
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
      return { ...m, tenue: c.tenue, descriptionPoste: null, confirmee, disponible: !confirmee, lieu: confirmee ? c.lieu : null, position: { lat: c.lieu.lat, lng: c.lieu.lng } };
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
      signes.delete(id);
      prevenir();
    },
    ecouterMissions(rappel) {
      ecouteurs.add(rappel);
      return () => {
        ecouteurs.delete(rappel);
      };
    },
    async mesMissions(): Promise<MissionConfirmee[]> {
      return missionsFictives()
        .filter((m) => confirmees.has(m.id))
        .map((m) => ({ ...m, contratSigne: signes.has(m.id), annulee: false, passee: false }));
    },
    async emailDuCompte() {
      return emailDemo;
    },
    async changerEmail(email) {
      emailDemo = { ...emailDemo, enAttente: email };
      return 'ok' as const;
    },
    async mesGains() {
      // Démonstration : deux missions déjà faites, puis les missions confirmées dans la session.
      const auj = aujourdhuiReunion();
      const passees = [
        { demandeId: 'g1', restaurant: 'Le Boucan Grillé', commune: 'Saint-Gilles-les-Bains', poste: 'serveur' as const, jour: ajouterJours(auj, -6), debut: 1080, fin: 0 },
        { demandeId: 'g2', restaurant: 'Chez Tatie Lucette', commune: 'Saint-Paul', poste: 'plonge' as const, jour: ajouterJours(auj, -20), debut: 1140, fin: 1410 },
      ].map((m) => ({ ...m, tauxHoraireBrutCentimes: 1231, effectuee: true, contratSigneExtra: true, contratSigneRestaurant: true }));
      const aVenir = missionsFictives()
        .filter((m) => confirmees.has(m.id))
        .map((m) => ({
          demandeId: m.id, restaurant: m.restaurant, commune: m.commune, poste: m.poste, jour: m.jour, debut: m.debut, fin: m.fin,
          tauxHoraireBrutCentimes: m.tauxHoraireBrutCentimes, effectuee: false, contratSigneExtra: signes.has(m.id), contratSigneRestaurant: false,
        }));
      return [...aVenir, ...passees];
    },
    async contrat(demandeId): Promise<ContratExtra | null> {
      const m = missionsFictives().find((x) => x.id === demandeId);
      const c = COMPLEMENTS[demandeId];
      if (!m || !c || !confirmees.has(demandeId)) return null;
      return {
        affectationId: `a-${demandeId}`,
        employeur: m.restaurant,
        adresseEmployeur: `${c.lieu.adresse}, ${c.lieu.codePostal} ${m.commune}`,
        siretEmployeur: null,
        secteur: SECTEUR_PAR_DEFAUT,
        signeExtra: signes.has(demandeId),
        signeRestaurant: false,
      };
    },
    async infosContrat() {
      return infos;
    },
    async enregistrerInfosContrat(i) {
      await attendre(400);
      infos = i;
    },
    async signerContrat(affectationId, image) {
      await attendre(900);
      signes.add(affectationId.replace(/^a-/, ''));
      imagesSignees.set(affectationId, { image, le: new Date().toISOString() });
      prevenir();
    },
    async signatures(affectationId) {
      return { restaurant: null, extra: imagesSignees.get(affectationId) ?? null };
    },
    async dispos() {
      return [...dispos];
    },
    async basculerDispo(jour, creneau, actif) {
      const cle = `${jour}:${creneau}` as CleDispo;
      if (actif) dispos.add(cle);
      else dispos.delete(cle);
    },
    async majProfil(p) {
      await attendre(300);
      profil = { ...profil, ...p };
      prevenir();
    },
    async maPhoto() {
      return photo;
    },
    async enregistrerPhoto(jpeg) {
      await attendre(600);
      photo = jpeg;
    },
    async supprimerPhoto() {
      await attendre(300);
      photo = null;
    },
    async session() {
      return 'ok';
    },
    async connecter(_tel, motDePasse) {
      await attendre(600);
      return motDePasse === MOT_DE_PASSE_DEMO ? 'ok' : 'identifiants';
    },
    async creerCompte(tel) {
      await attendre(600);
      return tel.endsWith('01') ? 'dejaInscrit' : 'ok';
    },
    async inscrire(i) {
      profil = { prenom: i.prenom, nom: i.nom, telephone: i.telephone, commune: i.commune, aVoiture: i.aVoiture, competences: [], experience: null, langues: [], presentation: '' };
      photo = null;
    },
    async deconnecter() {},
  };
}
