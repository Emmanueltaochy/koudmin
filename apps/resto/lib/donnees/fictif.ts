import {
  ajouterJours,
  aujourdhuiReunion,
  bornesMission,
  miseEnRelationFacturee,
  type ProfilPublic,
} from '@kivien/core';
import type {
  DemandeSuivi,
  ExtraAffecte,
  Facture,
  Favori,
  Membre,
  NouvelleDemande,
  Restaurant,
  SourceResto,
} from './source';
import { resoudreEtablissement } from './etablissementCourant';
import { agregerFavoris } from './favoris';
import { PARAMETRES_FICTIFS } from './parametresFictifs';

/**
 * Données fictives du restaurateur de démo (Le Boucan Grillé), gardées dans le sessionStorage
 * de l'onglet : une demande publiée reste visible d'une page à l'autre.
 */

const PARAMETRES = PARAMETRES_FICTIFS;

const RESTAURANT: Restaurant = {
  id: 'r001',
  nom: 'Le Boucan Grillé',
  telephone: '+262262000001',
  siret: '73282932000074',
  secteur: 'hotellerie_restauration',
  role: 'gerant',
  adresse: {
    libelle: '14 rue du Général de Gaulle, 97434 Saint-Gilles-les-Bains',
    voie: '14 rue du Général de Gaulle',
    codePostal: '97434',
    commune: 'Saint-Gilles-les-Bains',
    lat: -21.039442,
    lng: 55.237476,
  },
};

/** Second établissement de démonstration : un village vacances (secteur loisirs et vacances). */
const VILLAGE: Restaurant = {
  id: 'r002',
  nom: 'Village vacances Les Filaos',
  telephone: '+262262000002',
  siret: '44306184100047',
  secteur: 'loisirs_vacances',
  role: 'gerant',
  adresse: {
    libelle: '2 rue des Filaos, 97434 Saint-Gilles-les-Bains',
    voie: '2 rue des Filaos',
    codePostal: '97434',
    commune: 'Saint-Gilles-les-Bains',
    lat: -21.0601,
    lng: 55.2235,
  },
};

const CLE = 'kivien-resto-demo-v2';

/** Demande de démonstration (déjà rattachée à son établissement). */
type DemandeDemo = DemandeSuivi;

interface EtatDemo {
  etablissements: Restaurant[];
  demandes: DemandeDemo[];
  equipes: Record<string, Membre[]>;
}

/** Profils publics de démonstration (mêmes personnes que l'app extra). */
const PROFILS: Record<string, ProfilPublic> = {
  e1: { competences: ['serveur'], experience: '1_3_ans', langues: ['francais', 'creole'], presentation: 'Deux saisons en salle à Saint-Gilles.' },
  e2: { competences: ['plonge', 'commis'], experience: 'moins_1_an', langues: ['francais', 'creole', 'anglais'], presentation: "Rapide en plonge, à l'aise en cuisine." },
  e3: { competences: ['barman', 'serveur'], experience: 'plus_3_ans', langues: ['francais', 'anglais'], presentation: 'Bar à cocktails depuis 2021, service rapide.' },
};

function extra(
  id: string,
  prenom: string,
  nom: string,
  tel: string,
  options: Partial<ExtraAffecte> = {},
): ExtraAffecte {
  return {
    affectationId: `a-${id}-${Math.random().toString(36).slice(2, 7)}`,
    extraId: id,
    prenom,
    nom,
    telephone: tel,
    ...(PROFILS[id] ?? { competences: [], experience: null, langues: [], presentation: '' }),
    statut: 'confirmee',
    confirmeLe: new Date().toISOString(),
    majLe: new Date().toISOString(),
    contratSigneRestaurant: false,
    contratSigneExtra: false,
    contratSigneExtraLe: null,
    notation: null,
    favori: false,
    ...options,
  };
}

function demandesInitiales(): DemandeDemo[] {
  const auj = aujourdhuiReunion();
  const base = {
    restaurantId: RESTAURANT.id,
    tauxHoraireBrutCentimes: PARAMETRES.tauxHoraireBrutCentimes,
    fraisMiseEnRelationHTCentimes: PARAMETRES.fraisMiseEnRelationHTCentimes,
    adresse: '14 rue du Général de Gaulle',
    codePostal: '97434',
    commune: 'Saint-Gilles-les-Bains',
    retourAssure: true,
    consignes: 'Tenue noire. Chaussures fermées.',
    creeLe: new Date().toISOString(),
  };
  const kevin = (o: Partial<ExtraAffecte> = {}) => extra('e1', 'Kévin', 'Hoarau', '+262692000001', o);
  const maelle = (o: Partial<ExtraAffecte> = {}) => extra('e2', 'Maëlle', 'Payet', '+262693000002', o);
  const johan = (o: Partial<ExtraAffecte> = {}) => extra('e3', 'Johan', 'Grondin', '+262692000003', o);
  const fini = { statut: 'terminee' as const, contratSigneRestaurant: true, contratSigneExtra: true };
  return [
    { ...base, id: 'd001', poste: 'serveur', jour: auj, debut: 1080, fin: 0, nbExtras: 1, statut: 'pourvue', extras: [kevin({ contratSigneExtra: true, confirmeLe: new Date(Date.now() - 3 * 3600e3).toISOString(), contratSigneExtraLe: new Date(Date.now() - 2 * 3600e3).toISOString() })] },
    { ...base, id: 'd100', poste: 'plonge', jour: ajouterJours(auj, -1), debut: 1080, fin: 0, nbExtras: 1, statut: 'terminee', extras: [maelle(fini)] },
    { ...base, id: 'd101', poste: 'serveur', jour: ajouterJours(auj, -9), debut: 1080, fin: 0, nbExtras: 2, statut: 'terminee', extras: [kevin({ ...fini, notation: { present: true, note: 5 }, favori: true }), johan({ ...fini, notation: { present: true, note: 4 } })] },
    { ...base, id: 'd102', poste: 'barman', jour: ajouterJours(auj, -34), debut: 1080, fin: 60, nbExtras: 1, statut: 'terminee', extras: [johan({ ...fini, notation: { present: true, note: 4 } })] },
    { ...base, id: 'd103', poste: 'plonge', jour: ajouterJours(auj, 2), debut: 690, fin: 900, nbExtras: 1, statut: 'pourvue', extras: [maelle()] },
    {
      ...base,
      restaurantId: VILLAGE.id,
      id: 'd200',
      poste: 'animation',
      jour: ajouterJours(auj, 1),
      debut: 540,
      fin: 1020,
      nbExtras: 2,
      adresse: '2 rue des Filaos',
      retourAssure: false,
      consignes: 'Accueil des enfants de 6 à 11 ans. Tenue de sport.',
      statut: 'publiee',
      extras: [],
    },
  ];
}

function etatInitial(): EtatDemo {
  return {
    etablissements: [RESTAURANT, VILLAGE],
    demandes: demandesInitiales(),
    equipes: {
      [RESTAURANT.id]: [
        { utilisateurId: 'u-moi', telephone: '+262693000001', role: 'gerant', enAttente: false, moi: true },
        { utilisateurId: 'u-salle', telephone: '+262692112233', role: 'equipe', enAttente: false, moi: false },
        { utilisateurId: null, telephone: '+262693445566', role: 'equipe', enAttente: true, moi: false },
      ],
      [VILLAGE.id]: [{ utilisateurId: 'u-moi', telephone: '+262693000001', role: 'gerant', enAttente: false, moi: true }],
    },
  };
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sourceFictive(): SourceResto {
  const ecouteurs = new Set<() => void>();
  let memoire: EtatDemo | null = null;
  const signaturesDemo = new Map<string, { image: string; le: string }>();

  function etat(): EtatDemo {
    if (memoire) return memoire;
    try {
      const brut = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CLE) : null;
      memoire = brut ? (JSON.parse(brut) as EtatDemo) : etatInitial();
    } catch {
      memoire = etatInitial();
    }
    return memoire;
  }
  function enregistrer(e: EtatDemo) {
    memoire = e;
    try {
      sessionStorage.setItem(CLE, JSON.stringify(e));
    } catch {
      // Navigation privée : la démo reste en mémoire.
    }
    ecouteurs.forEach((f) => f());
  }
  const courant = () => resoudreEtablissement(etat().etablissements);
  /** Toutes les demandes (une demande s'ouvre par son lien, quel que soit l'établissement affiché). */
  const lire = (): DemandeDemo[] => etat().demandes;
  const ecrire = (demandes: DemandeDemo[]) => enregistrer({ ...etat(), demandes });
  const ecrireEquipe = (id: string, membres: Membre[]) => enregistrer({ ...etat(), equipes: { ...etat().equipes, [id]: membres } });
  const dernierGerant = (membres: Membre[]) => !membres.some((m) => m.role === 'gerant' && !m.enAttente);
  function modifierExtra(affectationId: string, f: (e: ExtraAffecte) => ExtraAffecte) {
    ecrire(lire().map((d) => ({ ...d, extras: d.extras.map((e) => (e.affectationId === affectationId ? f(e) : e)) })));
  }

  return {
    async etablissements() {
      return etat().etablissements;
    },
    async restaurant() {
      return courant();
    },
    async ajouterEtablissement(e) {
      await attendre(600);
      if (etat().etablissements.some((r) => r.siret === e.siret.replace(/\D/g, ''))) return { resultat: 'siret' };
      const id = `r${Date.now().toString(36)}`;
      const r: Restaurant = {
        id,
        nom: e.nom.trim(),
        telephone: null,
        siret: e.siret.replace(/\D/g, ''),
        secteur: e.secteur,
        role: 'gerant',
        adresse: e.adresse,
      };
      enregistrer({
        ...etat(),
        etablissements: [...etat().etablissements, r],
        equipes: { ...etat().equipes, [id]: [{ utilisateurId: 'u-moi', telephone: '+262693000001', role: 'gerant', enAttente: false, moi: true }] },
      });
      return { resultat: 'ok', id };
    },
    async modifierEtablissement(id, m) {
      await attendre(400);
      enregistrer({
        ...etat(),
        etablissements: etat().etablissements.map((r) => (r.id === id ? { ...r, nom: m.nom.trim(), adresse: m.adresse } : r)),
      });
      return 'ok';
    },
    async statistiques() {
      // Démonstration : quelques inscrits répartis sur l'île.
      const il = (jours: number) => new Date(Date.now() - jours * 86400e3).toISOString();
      const extra = (commune: string, competences: DemandeSuivi['poste'][], jours: number, dispo: boolean, voiture = false) => ({
        commune, competences, experience: '1_3_ans', aVoiture: voiture, inscritLe: il(jours), dispoWeekEnd: dispo, dispo7Jours: dispo,
      });
      return {
        extras: [
          extra('Saint-Paul', ['serveur', 'barman'], 2, true, true),
          extra('Saint-Paul', ['plonge', 'commis'], 5, true),
          extra('Le Port', ['cuisine'], 12, false, true),
          extra('Saint-Leu', ['serveur'], 1, true),
          extra('Saint-Pierre', ['serveur', 'reception'], 3, true, true),
          extra('Le Tampon', ['plonge'], 20, false),
          extra('Saint-Denis', ['animation'], 6, true),
          extra('Saint-André', ['demenagement'], 9, false, true),
        ],
        etablissements: [
          { commune: 'Saint-Gilles-les-Bains', lat: -21.0394, lng: 55.2375, secteur: 'hotellerie_restauration', inscritLe: il(30), demandes: 4 },
          { commune: 'Saint-Gilles-les-Bains', lat: -21.0601, lng: 55.2235, secteur: 'loisirs_vacances', inscritLe: il(8), demandes: 1 },
        ],
      };
    },
    async equipe(restaurantId) {
      return etat().equipes[restaurantId] ?? [];
    },
    async inviter(restaurantId, telephone, role) {
      await attendre(400);
      const membres = etat().equipes[restaurantId] ?? [];
      if (membres.some((m) => m.telephone === telephone && !m.enAttente)) return 'dejaMembre';
      if (['+262692000001', '+262693000002', '+262692000003'].includes(telephone)) return 'compteExtra';
      ecrireEquipe(restaurantId, [
        ...membres.filter((m) => m.telephone !== telephone),
        { utilisateurId: null, telephone, role, enAttente: true, moi: false },
      ]);
      return 'ok';
    },
    async annulerInvitation(restaurantId, telephone) {
      ecrireEquipe(restaurantId, (etat().equipes[restaurantId] ?? []).filter((m) => !(m.enAttente && m.telephone === telephone)));
    },
    async changerRole(restaurantId, utilisateurId, role) {
      const membres = (etat().equipes[restaurantId] ?? []).map((m) => (m.utilisateurId === utilisateurId ? { ...m, role } : m));
      if (dernierGerant(membres)) return 'dernierGerant';
      ecrireEquipe(restaurantId, membres);
      return 'ok';
    },
    async retirerMembre(restaurantId, utilisateurId) {
      const membres = (etat().equipes[restaurantId] ?? []).filter((m) => m.utilisateurId !== utilisateurId);
      if (dernierGerant(membres)) return 'dernierGerant';
      ecrireEquipe(restaurantId, membres);
      return 'ok';
    },
    async photoExtra(extraId) {
      // Démonstration : seul Kévin a une photo (visuel de la page d'accueil).
      if (extraId !== 'e1') return null;
      const blob = await (await fetch('/vitrine/salle.jpg')).blob();
      return await new Promise<string>((ok) => {
        const lecteur = new FileReader();
        lecteur.onload = () => ok(String(lecteur.result).replace(/^data:image\/\w+;base64,/, ''));
        lecteur.readAsDataURL(blob);
      });
    },
    async parametres() {
      return PARAMETRES;
    },
    async publier(n: NouvelleDemande) {
      await attendre(1200);
      const id = `d${Date.now().toString(36)}`;
      const d: DemandeDemo = {
        restaurantId: courant().id,
        id,
        poste: n.poste,
        jour: n.jour,
        debut: n.debut,
        fin: n.fin,
        tauxHoraireBrutCentimes: n.tauxHoraireBrutCentimes,
        fraisMiseEnRelationHTCentimes: PARAMETRES.fraisMiseEnRelationHTCentimes,
        adresse: n.adresse.voie,
        codePostal: n.adresse.codePostal,
        commune: n.adresse.commune,
        retourAssure: n.retourAssure,
        nbExtras: n.nbExtras,
        consignes: n.consignes,
        statut: 'publiee',
        creeLe: new Date().toISOString(),
        extras: [],
      };
      ecrire([d, ...lire()]);
      // Démo du temps réel : un extra dit « mi lé la » quelques secondes après la publication.
      setTimeout(() => {
        const courante = lire().find((x) => x.id === id);
        if (!courante || courante.statut !== 'publiee') return;
        const extras = [...courante.extras, extra('e2', 'Maëlle', 'Payet', '+262693000002')];
        ecrire(
          lire().map((x) =>
            x.id === id ? { ...x, extras, statut: extras.length >= x.nbExtras ? 'pourvue' : 'publiee' } : x,
          ),
        );
      }, 6000);
      return { id };
    },
    async demandes() {
      await attendre(300);
      const id = courant().id;
      return lire().filter((d) => d.restaurantId === id);
    },
    async demande(id) {
      return lire().find((d) => d.id === id) ?? null;
    },
    async annulerDemande(id) {
      await attendre(600);
      ecrire(lire().map((d) => (d.id === id ? { ...d, statut: 'annulee' } : d)));
    },
    async signatures(affectationId) {
      const r = signaturesDemo.get(affectationId);
      const e = lire().flatMap((d) => d.extras).find((x) => x.affectationId === affectationId);
      return {
        restaurant: r ?? null,
        // Démonstration : signature de l'extra dessinée (en production, celle tracée dans l'app).
        extra: e?.contratSigneExtra
          ? {
              image: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120"><path d="M20 80 C60 20 90 110 130 60 S200 30 240 70 L280 50" fill="none" stroke="#211C18" stroke-width="3" stroke-linecap="round"/></svg>')}`,
              le: e.contratSigneExtraLe ?? e.confirmeLe,
            }
          : null,
      };
    },
    async signerContrat(affectationId, signature) {
      await attendre(800);
      signaturesDemo.set(affectationId, { image: signature, le: new Date().toISOString() });
      modifierExtra(affectationId, (e) => ({ ...e, contratSigneRestaurant: true }));
    },
    async infosDPAE(affectationId) {
      const e = lire().flatMap((d) => d.extras).find((x) => x.affectationId === affectationId);
      if (!e) return null;
      // Valeurs de démonstration : en production, saisies par l'extra avant sa signature.
      return {
        prenom: e.prenom,
        nom: e.nom,
        dateNaissance: '2001-05-12',
        lieuNaissance: 'Saint-Paul (974)',
        nir: '1 01 05 974 151 234 xx',
        adresse: '5 chemin des Vacoas, 97460 Saint-Paul',
      };
    },
    async noter(affectationId, n) {
      await attendre(600);
      modifierExtra(affectationId, (e) => ({
        ...e,
        statut: n.present ? 'terminee' : 'absente',
        notation: { present: n.present, note: n.note },
        favori: n.favori,
      }));
    },
    async favoris(): Promise<Favori[]> {
      const id = courant().id;
      return agregerFavoris(lire().filter((d) => d.restaurantId === id));
    },
    async retirerFavori(extraId) {
      const id = courant().id;
      ecrire(lire().map((d) => (d.restaurantId !== id ? d : { ...d, extras: d.extras.map((e) => (e.extraId === extraId ? { ...e, favori: false } : e)) })));
    },
    async factures(): Promise<Facture[]> {
      const maintenant = Date.now();
      const parMois = new Map<string, number>();
      const id = courant().id;
      if (courant().role !== 'gerant') return [];
      for (const d of lire().filter((x) => x.restaurantId === id)) {
        if (bornesMission(d.jour, d.debut, d.fin).fin > maintenant) continue;
        const n = d.extras.filter((e) => miseEnRelationFacturee(e.statut)).length;
        if (n) parMois.set(d.jour.slice(0, 7), (parMois.get(d.jour.slice(0, 7)) ?? 0) + n);
      }
      return [...parMois.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([mois, n]) => ({
          mois,
          numero: `KVN-${mois.replace('-', '')}-0001`,
          misesEnRelation: n,
          montantHTCentimes: n * PARAMETRES.fraisMiseEnRelationHTCentimes,
          tauxTVA: PARAMETRES.tvaPourMille,
        }));
    },
    ecouter(rappel) {
      ecouteurs.add(rappel);
      return () => {
        ecouteurs.delete(rappel);
      };
    },
  };
}
