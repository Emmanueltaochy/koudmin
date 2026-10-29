import {
  ajouterJours,
  aujourdhuiReunion,
  bornesMission,
  miseEnRelationFacturee,
  type ParametresTarifaires,
} from '@kivien/core';
import type {
  DemandeSuivi,
  ExtraAffecte,
  Facture,
  Favori,
  NouvelleDemande,
  Restaurant,
  SourceResto,
} from './source';
import { agregerFavoris } from './favoris';

/**
 * Données fictives du restaurateur de démo (Le Boucan Grillé), gardées dans le sessionStorage
 * de l'onglet : une demande publiée reste visible d'une page à l'autre.
 */

const PARAMETRES: ParametresTarifaires = {
  dateEffet: '2026-01-01',
  tauxHoraireBrutCentimes: 1231,
  fraisMiseEnRelationHTCentimes: 2500,
  tvaPourMille: 85,
};

const RESTAURANT: Restaurant = {
  id: 'r001',
  nom: 'Le Boucan Grillé',
  telephone: '+262262000001',
  adresse: {
    libelle: '14 rue du Général de Gaulle, 97434 Saint-Gilles-les-Bains',
    voie: '14 rue du Général de Gaulle',
    codePostal: '97434',
    commune: 'Saint-Gilles-les-Bains',
    lat: -21.039442,
    lng: 55.237476,
  },
};

const CLE = 'kivien-resto-demo-v1';

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
    statut: 'confirmee',
    confirmeLe: new Date().toISOString(),
    contratSigneRestaurant: false,
    contratSigneExtra: false,
    notation: null,
    favori: false,
    ...options,
  };
}

function demandesInitiales(): DemandeSuivi[] {
  const auj = aujourdhuiReunion();
  const base = {
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
    { ...base, id: 'd001', poste: 'serveur', jour: auj, debut: 1080, fin: 0, nbExtras: 1, statut: 'pourvue', extras: [kevin({ contratSigneExtra: true })] },
    { ...base, id: 'd100', poste: 'plonge', jour: ajouterJours(auj, -1), debut: 1080, fin: 0, nbExtras: 1, statut: 'terminee', extras: [maelle(fini)] },
    { ...base, id: 'd101', poste: 'serveur', jour: ajouterJours(auj, -9), debut: 1080, fin: 0, nbExtras: 2, statut: 'terminee', extras: [kevin({ ...fini, notation: { present: true, note: 5 }, favori: true }), johan({ ...fini, notation: { present: true, note: 4 } })] },
    { ...base, id: 'd102', poste: 'barman', jour: ajouterJours(auj, -34), debut: 1080, fin: 60, nbExtras: 1, statut: 'terminee', extras: [johan({ ...fini, notation: { present: true, note: 4 } })] },
  ];
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sourceFictive(): SourceResto {
  const ecouteurs = new Set<() => void>();
  let memoire: DemandeSuivi[] | null = null;

  function lire(): DemandeSuivi[] {
    if (memoire) return memoire;
    try {
      const brut = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CLE) : null;
      memoire = brut ? (JSON.parse(brut) as DemandeSuivi[]) : demandesInitiales();
    } catch {
      memoire = demandesInitiales();
    }
    return memoire;
  }
  function ecrire(d: DemandeSuivi[]) {
    memoire = d;
    try {
      sessionStorage.setItem(CLE, JSON.stringify(d));
    } catch {
      // Navigation privée : la démo reste en mémoire.
    }
    ecouteurs.forEach((f) => f());
  }
  function modifierExtra(affectationId: string, f: (e: ExtraAffecte) => ExtraAffecte) {
    ecrire(lire().map((d) => ({ ...d, extras: d.extras.map((e) => (e.affectationId === affectationId ? f(e) : e)) })));
  }

  return {
    async restaurant() {
      return RESTAURANT;
    },
    async parametres() {
      return PARAMETRES;
    },
    async publier(n: NouvelleDemande) {
      await attendre(1200);
      const id = `d${Date.now().toString(36)}`;
      const d: DemandeSuivi = {
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
      return lire();
    },
    async demande(id) {
      return lire().find((d) => d.id === id) ?? null;
    },
    async annulerDemande(id) {
      await attendre(600);
      ecrire(lire().map((d) => (d.id === id ? { ...d, statut: 'annulee' } : d)));
    },
    async signerContrat(affectationId) {
      await attendre(800);
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
      return agregerFavoris(lire());
    },
    async retirerFavori(extraId) {
      ecrire(lire().map((d) => ({ ...d, extras: d.extras.map((e) => (e.extraId === extraId ? { ...e, favori: false } : e)) })));
    },
    async factures(): Promise<Facture[]> {
      const maintenant = Date.now();
      const parMois = new Map<string, number>();
      for (const d of lire()) {
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
