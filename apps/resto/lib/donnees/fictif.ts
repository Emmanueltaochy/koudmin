import {
  ajouterJours,
  aujourdhuiReunion,
  bornesMission,
  miseEnRelationFacturee,
  type ProfilPublic,
  type ProspectOsm,
} from '@kivien/core';
import type {
  CampagneProspection,
  RechercheProspects,
  MoyenPaiement,
  Prospect,
  PaiementFrais,
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
  e1: {
    competences: ['serveur'],
    experience: '1_3_ans',
    langues: ['francais', 'creole'],
    presentation: 'Deux saisons en salle à Saint-Gilles.',
  },
  e2: {
    competences: ['plonge', 'commis'],
    experience: 'moins_1_an',
    langues: ['francais', 'creole', 'anglais'],
    presentation: "Rapide en plonge, à l'aise en cuisine.",
  },
  e3: {
    competences: ['barman', 'serveur'],
    experience: 'plus_3_ans',
    langues: ['francais', 'anglais'],
    presentation: 'Bar à cocktails depuis 2021, service rapide.',
  },
};

const CONFIANCE: Record<string, ExtraAffecte['confiance']> = {
  e1: { missions: 6, notes: 5, noteMoyenneDixiemes: 48, absences: 0, dossierComplet: true },
  e2: { missions: 0, notes: 0, noteMoyenneDixiemes: null, absences: 0, dossierComplet: true },
  e3: { missions: 3, notes: 3, noteMoyenneDixiemes: 43, absences: 0, dossierComplet: false },
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
    confiance: CONFIANCE[id] ?? null,
    pointage: null,
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
    intitule: null,
    descriptionPoste: null,
    creeLe: new Date().toISOString(),
  };
  const kevin = (o: Partial<ExtraAffecte> = {}) =>
    extra('e1', 'Kévin', 'Hoarau', '+262692000001', o);
  const maelle = (o: Partial<ExtraAffecte> = {}) =>
    extra('e2', 'Maëlle', 'Payet', '+262693000002', o);
  const johan = (o: Partial<ExtraAffecte> = {}) =>
    extra('e3', 'Johan', 'Grondin', '+262692000003', o);
  const fini = {
    statut: 'terminee' as const,
    contratSigneRestaurant: true,
    contratSigneExtra: true,
  };
  return [
    {
      ...base,
      id: 'd001',
      poste: 'serveur',
      jour: auj,
      debut: 1080,
      fin: 0,
      nbExtras: 1,
      statut: 'pourvue',
      extras: [
        kevin({
          contratSigneExtra: true,
          confirmeLe: new Date(Date.now() - 3 * 3600e3).toISOString(),
          contratSigneExtraLe: new Date(Date.now() - 2 * 3600e3).toISOString(),
        }),
      ],
    },
    {
      ...base,
      id: 'd100',
      poste: 'plonge',
      jour: ajouterJours(auj, -1),
      debut: 1080,
      fin: 0,
      nbExtras: 1,
      statut: 'terminee',
      extras: [
        maelle({
          ...fini,
          pointage: {
            arriveeLe: `${ajouterJours(auj, -1)}T17:56:00+04:00`,
            departLe: `${ajouterJours(auj, -1)}T23:58:00+04:00`,
          },
        }),
      ],
    },
    {
      ...base,
      id: 'd101',
      poste: 'serveur',
      jour: ajouterJours(auj, -9),
      debut: 1080,
      fin: 0,
      nbExtras: 2,
      statut: 'terminee',
      extras: [
        kevin({ ...fini, notation: { present: true, note: 5 }, favori: true }),
        johan({ ...fini, notation: { present: true, note: 4 } }),
      ],
    },
    {
      ...base,
      id: 'd102',
      poste: 'barman',
      jour: ajouterJours(auj, -34),
      debut: 1080,
      fin: 60,
      nbExtras: 1,
      statut: 'terminee',
      extras: [johan({ ...fini, notation: { present: true, note: 4 } })],
    },
    {
      ...base,
      id: 'd103',
      poste: 'plonge',
      jour: ajouterJours(auj, 2),
      debut: 690,
      fin: 900,
      nbExtras: 1,
      statut: 'pourvue',
      extras: [maelle()],
    },
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
        {
          utilisateurId: 'u-moi',
          telephone: '+262693000001',
          role: 'gerant',
          enAttente: false,
          moi: true,
        },
        {
          utilisateurId: 'u-salle',
          telephone: '+262692112233',
          role: 'equipe',
          enAttente: false,
          moi: false,
        },
        {
          utilisateurId: null,
          telephone: '+262693445566',
          role: 'equipe',
          enAttente: true,
          moi: false,
        },
      ],
      [VILLAGE.id]: [
        {
          utilisateurId: 'u-moi',
          telephone: '+262693000001',
          role: 'gerant',
          enAttente: false,
          moi: true,
        },
      ],
    },
  };
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PROSPECTS_OSM_DEMO: ProspectOsm[] = [
  {
    osm_id: 'node/101',
    nom: 'Le Cap Méchant',
    categorie: 'restaurant',
    commune: 'Saint-Philippe',
    adresse: '1 rue du Cap',
    lat: -21.37,
    lng: 55.72,
    telephone: '+262 262 37 00 61',
    email: 'contact@capmechant.re',
    site: null,
  },
  {
    osm_id: 'node/102',
    nom: 'Ti Bar Lagon',
    categorie: 'bar',
    commune: 'Saint-Gilles-les-Bains',
    adresse: null,
    lat: -21.05,
    lng: 55.22,
    telephone: null,
    email: null,
    site: null,
  },
  {
    osm_id: 'way/103',
    nom: 'Hôtel des Hauts',
    categorie: 'hotel',
    commune: 'Cilaos',
    adresse: '12 chemin des Trois Mares',
    lat: -21.13,
    lng: 55.47,
    telephone: '+262 262 31 00 00',
    email: 'reception@hoteldeshauts.re',
    site: 'https://hoteldeshauts.re',
  },
  {
    osm_id: 'node/104',
    nom: 'Snack Chez Ti Jean',
    categorie: 'restauration_rapide',
    commune: 'Saint-Denis',
    adresse: null,
    lat: -20.88,
    lng: 55.45,
    telephone: '+262 692 00 11 22',
    email: null,
    site: null,
  },
];

const prospectionDemo: {
  prospects: Prospect[];
  campagnes: CampagneProspection[];
  recherche: RechercheProspects | null;
} = {
  prospects: [],
  campagnes: [],
  recherche: null,
};

const paiementDemo: { moyen: MoyenPaiement; historique: PaiementFrais[] } = {
  moyen: {
    mode: 'carte_mission',
    carte: null,
    sepa: null,
    sepaEnAttente: false,
    mandatValide: false,
  },
  historique: [
    {
      id: 'p2',
      type: 'mission',
      libelle: 'Kivien · mise en relation du 21/10/2026 · Le Boucan Grillé',
      moyen: 'carte',
      montantTTCCentimes: 2062,
      statut: 'echoue',
      erreur: 'Votre carte a été refusée.',
      creeLe: '2026-10-22T18:00:00Z',
    },
    {
      id: 'p1',
      type: 'mission',
      libelle: 'Kivien · mise en relation du 14/10/2026 · Le Boucan Grillé',
      moyen: 'carte',
      montantTTCCentimes: 2062,
      statut: 'reussi',
      erreur: null,
      creeLe: '2026-10-15T18:00:00Z',
    },
  ],
};

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
  const ecrireEquipe = (id: string, membres: Membre[]) =>
    enregistrer({ ...etat(), equipes: { ...etat().equipes, [id]: membres } });
  const dernierGerant = (membres: Membre[]) =>
    !membres.some((m) => m.role === 'gerant' && !m.enAttente);
  function modifierExtra(affectationId: string, f: (e: ExtraAffecte) => ExtraAffecte) {
    ecrire(
      lire().map((d) => ({
        ...d,
        extras: d.extras.map((e) => (e.affectationId === affectationId ? f(e) : e)),
      })),
    );
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
      if (etat().etablissements.some((r) => r.siret === e.siret.replace(/\D/g, '')))
        return { resultat: 'siret' };
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
        equipes: {
          ...etat().equipes,
          [id]: [
            {
              utilisateurId: 'u-moi',
              telephone: '+262693000001',
              role: 'gerant',
              enAttente: false,
              moi: true,
            },
          ],
        },
      });
      return { resultat: 'ok', id };
    },
    async modifierEtablissement(id, m) {
      await attendre(400);
      enregistrer({
        ...etat(),
        etablissements: etat().etablissements.map((r) =>
          r.id === id ? { ...r, nom: m.nom.trim(), adresse: m.adresse } : r,
        ),
      });
      return 'ok';
    },
    paiement: {
      // Démonstration : pas de vraie banque ; les pages Stripe et GoCardless sont simulées.
      async moyen() {
        return { ...paiementDemo.moyen };
      },
      async historique() {
        return paiementDemo.historique.map((p) => ({ ...p }));
      },
      async aRegler() {
        return paiementDemo.moyen.carte || paiementDemo.moyen.sepa
          ? { misesEnRelation: 0, ttcCentimes: 0 }
          : { misesEnRelation: 1, ttcCentimes: 2062 };
      },
      async agir(_id, a) {
        await attendre(500);
        const m = paiementDemo.moyen;
        switch (a.action) {
          case 'carte':
            return { url: '/paiement?retour=carte&session=cs_demo' };
          case 'carte-confirmer':
            m.carte = 'Visa •••• 4242 · 12/28';
            return { statut: 'ok' };
          case 'sepa':
            return { url: '/paiement?retour=sepa' };
          case 'sepa-confirmer':
            Object.assign(m, {
              sepa: 'IBAN •••• 1234',
              sepaEnAttente: false,
              mandatValide: true,
              mode: m.mode.startsWith('mensuel') ? 'mensuel_sepa' : 'sepa_mission',
            });
            return { statut: 'ok' };
          case 'mode': {
            const sepa = a.mode === 'sepa_mission' || a.mode === 'mensuel_sepa';
            if (sepa ? !m.mandatValide : !m.carte)
              return {
                statut: 'echoue',
                erreur: sepa
                  ? 'Mettez d’abord en place le prélèvement SEPA.'
                  : 'Enregistrez d’abord une carte.',
              };
            m.mode = a.mode;
            return { statut: 'ok' };
          }
          case 'reessayer': {
            const p = paiementDemo.historique.find((x) => x.id === a.paiement);
            if (p) Object.assign(p, { statut: 'reussi', erreur: null });
            return { statut: 'reussi' };
          }
        }
      },
    },
    admin: {
      prospection: {
        // Démonstration : échantillon fixe à la place d'OpenStreetMap, aucun e-mail n'est envoyé.
        async demanderRecherche() {
          // Démonstration : la « recherche du VPS » se termine en deux secondes avec un échantillon.
          prospectionDemo.recherche = {
            statut: 'en_cours',
            demandeeLe: new Date().toISOString(),
            finLe: null,
            trouves: null,
            ajoutes: null,
            emailsTrouves: null,
            erreur: null,
          };
          setTimeout(() => {
            const avant = prospectionDemo.prospects.length;
            for (const f of PROSPECTS_OSM_DEMO) {
              if (prospectionDemo.prospects.some((p) => p.id === f.osm_id)) continue;
              prospectionDemo.prospects.push({
                id: f.osm_id,
                nom: f.nom,
                categorie: f.categorie,
                commune: f.commune,
                adresse: f.adresse,
                lat: f.lat,
                lng: f.lng,
                telephone: f.telephone,
                email: f.email,
                sourceEmail: f.email ? (f.site ? 'site' : 'osm') : null,
                site: f.site,
                statut: 'a_contacter',
                notes: null,
                desinscrit: false,
                dernierEnvoi: null,
                envois: 0,
              });
            }
            prospectionDemo.recherche = {
              ...prospectionDemo.recherche!,
              statut: 'terminee',
              finLe: new Date().toISOString(),
              trouves: PROSPECTS_OSM_DEMO.length,
              ajoutes: prospectionDemo.prospects.length - avant,
              emailsTrouves: 1,
            };
          }, 2000);
        },
        async derniereRecherche() {
          return prospectionDemo.recherche ? { ...prospectionDemo.recherche } : null;
        },
        async prospects() {
          return prospectionDemo.prospects.map((p) => ({ ...p }));
        },
        async importer(fiches) {
          let ajoutes = 0;
          for (const f of fiches) {
            if (prospectionDemo.prospects.some((p) => p.id === f.osm_id)) continue;
            ajoutes++;
            prospectionDemo.prospects.push({
              id: f.osm_id,
              nom: f.nom,
              categorie: f.categorie,
              commune: f.commune,
              adresse: f.adresse,
              lat: f.lat,
              lng: f.lng,
              telephone: f.telephone,
              email: f.email,
              sourceEmail: f.email ? 'osm' : null,
              site: f.site,
              statut: 'a_contacter',
              notes: null,
              desinscrit: false,
              dernierEnvoi: null,
              envois: 0,
            });
          }
          return { ajoutes, misAJour: fiches.length - ajoutes };
        },
        async modifier(id, m) {
          if (m.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(m.email)) return 'email';
          const p = prospectionDemo.prospects.find((x) => x.id === id);
          if (p)
            Object.assign(p, {
              ...m,
              email: m.email?.trim().toLowerCase() || null,
              sourceEmail: m.email ? 'manuel' : null,
            });
          return 'ok';
        },
        async ajouter(f) {
          if (f.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) return 'email';
          prospectionDemo.prospects.push({
            id: `m${Date.now()}`,
            nom: f.nom.trim(),
            categorie: f.categorie,
            commune: f.commune,
            adresse: null,
            lat: null,
            lng: null,
            telephone: f.telephone,
            email: f.email?.trim().toLowerCase() || null,
            sourceEmail: f.email ? 'manuel' : null,
            site: null,
            statut: 'a_contacter',
            notes: null,
            desinscrit: false,
            dernierEnvoi: null,
            envois: 0,
          });
          return 'ok';
        },
        async lancerCampagne(sujet, _message, ids) {
          const cibles = prospectionDemo.prospects.filter(
            (p) => ids.includes(p.id) && p.email && !p.desinscrit && p.envois === 0,
          );
          if (cibles.length) {
            prospectionDemo.campagnes.unshift({
              id: `c${Date.now()}`,
              sujet,
              creeLe: new Date().toISOString(),
              total: cibles.length,
              envoyes: 0,
              enAttente: cibles.length,
              echecs: 0,
              clics: 0,
              inscriptions: 0,
            });
            for (const p of cibles) p.envois = 1;
          }
          return cibles.length;
        },
        async campagnes() {
          return prospectionDemo.campagnes.map((c) => ({ ...c }));
        },
        async suiviCampagne() {
          // Démonstration : un établissement a cliqué, visité trois pages et créé son compte.
          const il = (min: number) => new Date(Date.now() - min * 60e3).toISOString();
          return prospectionDemo.prospects
            .filter((p) => p.envois > 0)
            .map((p, i) => ({
              envoiId: `e-${p.id}`,
              nom: p.nom,
              commune: p.commune,
              email: p.email ?? '',
              statut: 'envoye' as const,
              envoyeLe: il(120),
              erreur: null,
              premierClic: i === 0 ? il(90) : null,
              derniereVisite: i === 0 ? il(80) : null,
              pagesVues: i === 0 ? 3 : 0,
              pages: i === 0 ? ['/', '/extras', '/inscription/restaurant'] : [],
              inscritLe: i === 0 ? il(80) : null,
            }));
        },
        async noterVisite() {},
        async noterInscription() {},
        async seDesinscrire(jeton) {
          return jeton === 'demo';
        },
      },
      // Démonstration : chiffres d'un premier mois d'activité.
      async tableau(jours) {
        const mois = (n: number) =>
          new Date(Date.now() - n * 31 * 86400e3).toISOString().slice(0, 7);
        return {
          periode_jours: jours,
          demande: {
            demandes: 42,
            places: 51,
            pourvues: 46,
            annulees: 3,
            en_recherche: 2,
            delai_median_minutes: 38,
            par_poste: { serveur: 18, plonge: 11, commis: 8, barman: 6, cuisine: 4, animation: 4 },
          },
          offre: { extras: 127, nouveaux: 31, actifs: 34, dispo_7_jours: 58, avec_photo: 71 },
          etablissements: { total: 19, nouveaux: 6, actifs: 14, utilisateurs: 27 },
          valeur: {
            frais_ht_centimes: 43 * 1900,
            tva_centimes: Math.round(43 * 1900 * 0.085),
            salaires_bruts_centimes: 43 * 8125,
            missions_facturees: 43,
            frais_a_venir_ht_centimes: 3 * 1900,
          },
          qualite: {
            note_moyenne: 4.6,
            notations: 38,
            absences: 1,
            desistements: 4,
            contrats_signes: 44,
          },
          par_mois: [
            {
              mois: mois(2),
              demandes: 6,
              places: 7,
              pourvues: 6,
              frais_ht_centimes: 6 * 2500,
              salaires_bruts_centimes: 6 * 8125,
            },
            {
              mois: mois(1),
              demandes: 17,
              places: 20,
              pourvues: 18,
              frais_ht_centimes: 18 * 2500,
              salaires_bruts_centimes: 18 * 8125,
            },
            {
              mois: mois(0),
              demandes: 42,
              places: 51,
              pourvues: 46,
              frais_ht_centimes: 43 * 1900,
              salaires_bruts_centimes: 43 * 8125,
            },
          ],
        };
      },
      async etablissements() {
        const il = (j: number) => new Date(Date.now() - j * 86400e3).toISOString();
        return [
          {
            id: 'r001',
            nom: 'Le Boucan Grillé',
            commune: 'Saint-Paul',
            lat: -21.0394,
            lng: 55.2375,
            secteur: 'hotellerie_restauration',
            siret: '73282932000074',
            telephone: '+262262000001',
            inscritLe: il(40),
            utilisateurs: 3,
            demandes: 12,
            placesPourvues: 14,
            fraisHTCentimes: 14 * 1900,
            derniereDemande: il(0),
          },
          {
            id: 'r002',
            nom: 'Village vacances Les Filaos',
            commune: 'Saint-Paul',
            lat: -21.0601,
            lng: 55.2235,
            secteur: 'loisirs_vacances',
            siret: '44306184100047',
            telephone: '+262262000002',
            inscritLe: il(9),
            utilisateurs: 1,
            demandes: 3,
            placesPourvues: 4,
            fraisHTCentimes: 4 * 1900,
            derniereDemande: il(1),
          },
          {
            id: 'r003',
            nom: 'Ti Kaz Bar',
            commune: 'Saint-Pierre',
            lat: -21.3393,
            lng: 55.4781,
            secteur: 'hotellerie_restauration',
            siret: null,
            telephone: null,
            inscritLe: il(3),
            utilisateurs: 1,
            demandes: 0,
            placesPourvues: 0,
            fraisHTCentimes: 0,
            derniereDemande: null,
          },
        ];
      },
      async extras() {
        const il = (j: number) => new Date(Date.now() - j * 86400e3).toISOString();
        return [
          {
            id: 'e1',
            prenom: 'Kévin',
            nom: 'Hoarau',
            telephone: '+262692000001',
            commune: 'Saint-Paul',
            competences: ['serveur', 'barman'],
            experience: '1_3_ans',
            aVoiture: true,
            inscritLe: il(30),
            missions: 9,
            absences: 0,
            desistements: 1,
            noteMoyenne: 4.8,
            dispo7Jours: true,
            avecPhoto: true,
          },
          {
            id: 'e2',
            prenom: 'Maëlle',
            nom: 'Payet',
            telephone: '+262693000002',
            commune: 'Le Port',
            competences: ['plonge', 'commis'],
            experience: 'moins_1_an',
            aVoiture: false,
            inscritLe: il(12),
            missions: 4,
            absences: 0,
            desistements: 0,
            noteMoyenne: 4.5,
            dispo7Jours: true,
            avecPhoto: false,
          },
          {
            id: 'e3',
            prenom: 'Johan',
            nom: 'Grondin',
            telephone: '+262692000003',
            commune: 'Saint-Pierre',
            competences: ['barman', 'serveur'],
            experience: 'plus_3_ans',
            aVoiture: true,
            inscritLe: il(2),
            missions: 0,
            absences: 0,
            desistements: 0,
            noteMoyenne: null,
            dispo7Jours: false,
            avecPhoto: true,
          },
        ];
      },
      async demandes() {
        return lire().map((d) => ({
          id: d.id,
          etablissement: etat().etablissements.find((r) => r.id === d.restaurantId)?.nom ?? '',
          commune: d.commune,
          poste: d.poste,
          jour: d.jour,
          debut: d.debut,
          fin: d.fin,
          nbExtras: d.nbExtras,
          pourvues: d.extras.filter((e) => e.statut !== 'desistee').length,
          statut: d.statut,
          publieeLe: d.creeLe,
          delaiMinutes: d.extras.length ? 35 : null,
          fraisHTCentimes: d.fraisMiseEnRelationHTCentimes,
          intitule: d.intitule,
        }));
      },
    },
    async statistiques() {
      // Démonstration : quelques inscrits répartis sur l'île.
      const il = (jours: number) => new Date(Date.now() - jours * 86400e3).toISOString();
      const extra = (
        commune: string,
        competences: DemandeSuivi['poste'][],
        jours: number,
        dispo: boolean,
        voiture = false,
      ) => ({
        commune,
        competences,
        experience: '1_3_ans',
        aVoiture: voiture,
        inscritLe: il(jours),
        dispoWeekEnd: dispo,
        dispo7Jours: dispo,
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
          {
            commune: 'Saint-Gilles-les-Bains',
            lat: -21.0394,
            lng: 55.2375,
            secteur: 'hotellerie_restauration',
            inscritLe: il(30),
            demandes: 4,
          },
          {
            commune: 'Saint-Gilles-les-Bains',
            lat: -21.0601,
            lng: 55.2235,
            secteur: 'loisirs_vacances',
            inscritLe: il(8),
            demandes: 1,
          },
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
      if (['+262692000001', '+262693000002', '+262692000003'].includes(telephone))
        return 'compteExtra';
      ecrireEquipe(restaurantId, [
        ...membres.filter((m) => m.telephone !== telephone),
        { utilisateurId: null, telephone, role, enAttente: true, moi: false },
      ]);
      return 'ok';
    },
    async annulerInvitation(restaurantId, telephone) {
      ecrireEquipe(
        restaurantId,
        (etat().equipes[restaurantId] ?? []).filter(
          (m) => !(m.enAttente && m.telephone === telephone),
        ),
      );
    },
    async changerRole(restaurantId, utilisateurId, role) {
      const membres = (etat().equipes[restaurantId] ?? []).map((m) =>
        m.utilisateurId === utilisateurId ? { ...m, role } : m,
      );
      if (dernierGerant(membres)) return 'dernierGerant';
      ecrireEquipe(restaurantId, membres);
      return 'ok';
    },
    async retirerMembre(restaurantId, utilisateurId) {
      const membres = (etat().equipes[restaurantId] ?? []).filter(
        (m) => m.utilisateurId !== utilisateurId,
      );
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
        intitule: n.intitule,
        descriptionPoste: n.descriptionPoste,
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
            x.id === id
              ? { ...x, extras, statut: extras.length >= x.nbExtras ? 'pourvue' : 'publiee' }
              : x,
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
      const e = lire()
        .flatMap((d) => d.extras)
        .find((x) => x.affectationId === affectationId);
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
      const e = lire()
        .flatMap((d) => d.extras)
        .find((x) => x.affectationId === affectationId);
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
      ecrire(
        lire().map((d) =>
          d.restaurantId !== id
            ? d
            : {
                ...d,
                extras: d.extras.map((e) => (e.extraId === extraId ? { ...e, favori: false } : e)),
              },
        ),
      );
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
