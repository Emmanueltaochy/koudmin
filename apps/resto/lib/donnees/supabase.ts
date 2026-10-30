import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  aujourdhuiReunion,
  estSecteur,
  SECTEUR_PAR_DEFAUT,
  type ParametresTarifaires,
  type Poste,
  type StatutAffectation,
  type StatutDemande,
} from '@kivien/core';
import { resoudreEtablissement } from './etablissementCourant';
import {
  ErreurReseau,
  type DemandeSuivi,
  type ExtraAffecte,
  type Facture,
  type Favori,
  type Membre,
  type Restaurant,
  type Role,
  type SourceResto,
} from './source';
import { agregerFavoris } from './favoris';

type UnOuPlusieurs<T> = T | T[] | null;
const premier = <T,>(v: UnOuPlusieurs<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

interface LigneDemande {
  id: string;
  restaurant_id: string;
  poste: Poste;
  jour: string;
  debut: number;
  fin: number;
  taux_horaire_brut_centimes: number;
  frais_mise_en_relation_ht_centimes: number;
  adresse: string;
  code_postal: string | null;
  commune: string;
  retour_assure: boolean;
  nb_extras: number;
  consignes: string | null;
  statut: StatutDemande;
  created_at: string;
  affectations: {
    id: string;
    extra_id: string;
    statut: StatutAffectation;
    created_at: string;
    extras: UnOuPlusieurs<{
      prenom: string;
      nom: string;
      telephone: string;
      competences: ExtraAffecte['competences'];
      experience: ExtraAffecte['experience'];
      langues: ExtraAffecte['langues'];
      presentation: string;
    }>;
    contrats: UnOuPlusieurs<{ signe_restaurant_le: string | null; signe_extra_le: string | null }>;
    notations: UnOuPlusieurs<{ present: boolean; note: number | null }>;
  }[];
}

const SELECTION = `id, restaurant_id, poste, jour, debut, fin, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes,
  adresse, code_postal, commune, retour_assure, nb_extras, consignes, statut, created_at,
  affectations ( id, extra_id, statut, created_at,
    extras ( prenom, nom, telephone, competences, experience, langues, presentation ),
    contrats ( signe_restaurant_le, signe_extra_le ),
    notations ( present, note ) )`;

function verifier<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) {
    if (/network|fetch/i.test(r.error.message)) throw new ErreurReseau(r.error.message);
    throw new Error(r.error.message);
  }
  return r.data as T;
}

function versDemande(l: LigneDemande, favoris: Set<string>): DemandeSuivi {
  return {
    id: l.id,
    restaurantId: l.restaurant_id,
    poste: l.poste,
    jour: l.jour,
    debut: l.debut,
    fin: l.fin,
    tauxHoraireBrutCentimes: l.taux_horaire_brut_centimes,
    fraisMiseEnRelationHTCentimes: l.frais_mise_en_relation_ht_centimes,
    adresse: l.adresse,
    codePostal: l.code_postal,
    commune: l.commune,
    retourAssure: l.retour_assure,
    nbExtras: l.nb_extras,
    consignes: l.consignes,
    statut: l.statut,
    creeLe: l.created_at,
    extras: l.affectations.map((a): ExtraAffecte => {
      const e = premier(a.extras);
      const c = premier(a.contrats);
      const n = premier(a.notations);
      return {
        affectationId: a.id,
        extraId: a.extra_id,
        prenom: e?.prenom ?? '',
        nom: e?.nom ?? '',
        telephone: e?.telephone ?? '',
        competences: e?.competences ?? [],
        experience: e?.experience ?? null,
        langues: e?.langues ?? [],
        presentation: e?.presentation ?? '',
        statut: a.statut,
        confirmeLe: a.created_at,
        contratSigneRestaurant: !!c?.signe_restaurant_le,
        contratSigneExtra: !!c?.signe_extra_le,
        notation: n ? { present: n.present, note: n.note } : null,
        favori: favoris.has(a.extra_id),
      };
    }),
  };
}

interface LigneEtablissement {
  id: string;
  nom: string;
  telephone: string | null;
  siret: string | null;
  secteur: string;
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  lat: number | null;
  lng: number | null;
  role: Role;
}

function versRestaurant(r: LigneEtablissement): Restaurant {
  return {
    id: r.id,
    nom: r.nom,
    telephone: r.telephone,
    siret: r.siret,
    secteur: estSecteur(r.secteur) ? r.secteur : SECTEUR_PAR_DEFAUT,
    role: r.role,
    adresse:
      r.adresse && r.commune && r.lat !== null && r.lng !== null
        ? {
            libelle: `${r.adresse}, ${r.code_postal ?? ''} ${r.commune}`.replace(/\s+/g, ' '),
            voie: r.adresse,
            codePostal: r.code_postal ?? '',
            commune: r.commune,
            lat: r.lat,
            lng: r.lng,
          }
        : null,
  };
}

/** Refus attendus du serveur, reconnus à leur message (fonctions SQL). */
const refus = (e: { message: string } | null, motif: RegExp) => !!e && motif.test(e.message);

export function sourceSupabase(url: string, cle: string): SourceResto & { client: SupabaseClient } {
  const client = createClient(url, cle);

  /** Favoris d'un établissement ; sans identifiant, ceux de tous (une demande ouverte par lien). */
  async function idsFavoris(restaurantId?: string): Promise<Set<string>> {
    let requete = client.from('favoris').select('extra_id, restaurant_id');
    if (restaurantId) requete = requete.eq('restaurant_id', restaurantId);
    const lignes = verifier(await requete) as { extra_id: string }[];
    return new Set(lignes.map((f) => f.extra_id));
  }

  const source: SourceResto & { client: SupabaseClient } = {
    client,
    async photoExtra(extraId: string) {
      return verifier(await client.rpc('photo_extra', { p_extra: extraId })) as string | null;
    },
    async etablissements(): Promise<Restaurant[]> {
      return (verifier(await client.rpc('mes_etablissements')) as LigneEtablissement[]).map(versRestaurant);
    },
    async restaurant(): Promise<Restaurant> {
      return resoudreEtablissement(await source.etablissements());
    },
    async ajouterEtablissement(e) {
      const { data, error } = await client.rpc('creer_etablissement', {
        p_nom: e.nom,
        p_siret: e.siret,
        p_secteur: e.secteur,
        p_adresse: e.adresse.voie,
        p_code_postal: e.adresse.codePostal,
        p_commune: e.adresse.commune,
        p_lat: e.adresse.lat,
        p_lng: e.adresse.lng,
      });
      if (!error) return { resultat: 'ok' as const, id: data as string };
      if (refus(error, /SIRET déjà inscrit/)) return { resultat: 'siret' as const };
      if (refus(error, /SIRET invalide/)) return { resultat: 'siretInvalide' as const };
      if (refus(error, /compte extra/)) return { resultat: 'extra' as const };
      if (refus(error, /hors de La Réunion/)) return { resultat: 'adresse' as const };
      throw /network|fetch/i.test(error.message) ? new ErreurReseau(error.message) : new Error(error.message);
    },
    async modifierEtablissement(id, m) {
      const { error } = await client.rpc('modifier_etablissement', {
        p_restaurant: id,
        p_nom: m.nom,
        p_adresse: m.adresse.voie,
        p_code_postal: m.adresse.codePostal,
        p_commune: m.adresse.commune,
        p_lat: m.adresse.lat,
        p_lng: m.adresse.lng,
      });
      if (refus(error, /hors de La Réunion/)) return 'adresse';
      verifier({ data: null, error });
      return 'ok';
    },
    async equipe(restaurantId) {
      const lignes = verifier(await client.rpc('equipe_etablissement', { p_restaurant: restaurantId })) as {
        utilisateur_id: string | null;
        telephone: string;
        role: Role;
        en_attente: boolean;
        moi: boolean;
      }[];
      return lignes.map(
        (l): Membre => ({ utilisateurId: l.utilisateur_id, telephone: l.telephone, role: l.role, enAttente: l.en_attente, moi: l.moi }),
      );
    },
    async inviter(restaurantId, telephone, role) {
      const { error } = await client.rpc('inviter_membre', { p_restaurant: restaurantId, p_telephone: telephone, p_role: role });
      if (refus(error, /déjà accès/)) return 'dejaMembre';
      if (refus(error, /compte extra/)) return 'compteExtra';
      if (refus(error, /Réservé au gérant/)) return 'reserve';
      verifier({ data: null, error });
      return 'ok';
    },
    async annulerInvitation(restaurantId, telephone) {
      verifier(await client.rpc('annuler_invitation', { p_restaurant: restaurantId, p_telephone: telephone }));
    },
    async changerRole(restaurantId, utilisateurId, role) {
      const { error } = await client.rpc('changer_role', { p_restaurant: restaurantId, p_utilisateur: utilisateurId, p_role: role });
      if (refus(error, /gérant requis/)) return 'dernierGerant';
      verifier({ data: null, error });
      return 'ok';
    },
    async retirerMembre(restaurantId, utilisateurId) {
      const { error } = await client.rpc('retirer_membre', { p_restaurant: restaurantId, p_utilisateur: utilisateurId });
      if (refus(error, /gérant requis/)) return 'dernierGerant';
      verifier({ data: null, error });
      return 'ok';
    },
    async parametres(): Promise<ParametresTarifaires> {
      const p = verifier(
        await client
          .from('parametres')
          .select('date_effet, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes, tva_pour_mille')
          .lte('date_effet', aujourdhuiReunion())
          .order('date_effet', { ascending: false })
          .limit(1)
          .single(),
      ) as {
        date_effet: string;
        taux_horaire_brut_centimes: number;
        frais_mise_en_relation_ht_centimes: number;
        tva_pour_mille: number;
      };
      return {
        dateEffet: p.date_effet,
        tauxHoraireBrutCentimes: p.taux_horaire_brut_centimes,
        fraisMiseEnRelationHTCentimes: p.frais_mise_en_relation_ht_centimes,
        tvaPourMille: p.tva_pour_mille,
      };
    },
    async publier(d) {
      const r = await source.restaurant();
      const ligne = verifier(
        await client
          .from('demandes')
          .insert({
            restaurant_id: r.id,
            poste: d.poste,
            jour: d.jour,
            debut: d.debut,
            fin: d.fin,
            taux_horaire_brut_centimes: d.tauxHoraireBrutCentimes,
            adresse: d.adresse.voie,
            code_postal: d.adresse.codePostal,
            commune: d.adresse.commune,
            lat: d.adresse.lat,
            lng: d.adresse.lng,
            retour_assure: d.retourAssure,
            nb_extras: d.nbExtras,
            consignes: d.consignes,
          })
          .select('id')
          .single(),
      ) as { id: string };
      return { id: ligne.id };
    },
    async demandes() {
      const r = await source.restaurant();
      const [lignes, favoris] = await Promise.all([
        client.from('demandes').select(SELECTION).eq('restaurant_id', r.id).order('jour', { ascending: false }).order('debut'),
        idsFavoris(r.id),
      ]);
      return (verifier(lignes) as unknown as LigneDemande[]).map((l) => versDemande(l, favoris));
    },
    async demande(id) {
      const [ligne, favoris] = await Promise.all([
        client.from('demandes').select(SELECTION).eq('id', id).maybeSingle(),
        idsFavoris(),
      ]);
      const l = verifier(ligne) as unknown as LigneDemande | null;
      return l ? versDemande(l, favoris) : null;
    },
    async annulerDemande(id) {
      verifier(await client.from('demandes').update({ statut: 'annulee' }).eq('id', id));
    },
    async signerContrat(affectationId, signature) {
      verifier(await client.rpc('signer_contrat', { p_affectation: affectationId, p_signature: signature }));
    },
    async infosDPAE(affectationId) {
      const lignes = verifier(await client.rpc('infos_dpae', { p_affectation: affectationId })) as {
        prenom: string;
        nom: string;
        date_naissance: string | null;
        lieu_naissance: string | null;
        nir: string | null;
        adresse: string | null;
      }[];
      const l = lignes[0];
      return l
        ? { prenom: l.prenom, nom: l.nom, dateNaissance: l.date_naissance, lieuNaissance: l.lieu_naissance, nir: l.nir, adresse: l.adresse }
        : null;
    },
    async noter(affectationId, n) {
      verifier(
        await client.rpc('noter_mission', {
          p_affectation: affectationId,
          p_present: n.present,
          p_note: n.note,
          p_favori: n.favori,
          p_commentaire: n.commentaire,
        }),
      );
    },
    async favoris(): Promise<Favori[]> {
      return agregerFavoris(await source.demandes());
    },
    async retirerFavori(extraId) {
      const r = await source.restaurant();
      verifier(await client.from('favoris').delete().eq('restaurant_id', r.id).eq('extra_id', extraId));
    },
    async factures(): Promise<Facture[]> {
      const r = await source.restaurant();
      const lignes = verifier(await client.rpc('factures_restaurant', { p_restaurant: r.id })) as {
        mois: string;
        mises_en_relation: number;
        montant_ht_centimes: number;
        tva_pour_mille: number;
      }[];
      return lignes.map((f) => ({
        mois: f.mois,
        numero: `KVN-${f.mois.replace('-', '')}`,
        misesEnRelation: f.mises_en_relation,
        montantHTCentimes: f.montant_ht_centimes,
        tauxTVA: f.tva_pour_mille,
      }));
    },
    ecouter(rappel) {
      const canal = client
        .channel('suivi-restaurant')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, rappel)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'affectations' }, rappel)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, rappel)
        .subscribe();
      return () => {
        void client.removeChannel(canal);
      };
    },
  };
  return source;
}
