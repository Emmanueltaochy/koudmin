import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { aujourdhuiReunion, type ParametresTarifaires, type Poste, type StatutAffectation, type StatutDemande } from '@koudmin/core';
import {
  ErreurReseau,
  type DemandeSuivi,
  type ExtraAffecte,
  type Facture,
  type Favori,
  type SourceResto,
} from './source';
import { agregerFavoris } from './favoris';

type UnOuPlusieurs<T> = T | T[] | null;
const premier = <T,>(v: UnOuPlusieurs<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

interface LigneDemande {
  id: string;
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
    extras: UnOuPlusieurs<{ prenom: string; nom: string; telephone: string }>;
    contrats: UnOuPlusieurs<{ signe_restaurant_le: string | null; signe_extra_le: string | null }>;
    notations: UnOuPlusieurs<{ present: boolean; note: number | null }>;
  }[];
}

const SELECTION = `id, poste, jour, debut, fin, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes,
  adresse, code_postal, commune, retour_assure, nb_extras, consignes, statut, created_at,
  affectations ( id, extra_id, statut, created_at,
    extras ( prenom, nom, telephone ),
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

export function sourceSupabase(url: string, cle: string): SourceResto & { client: SupabaseClient } {
  const client = createClient(url, cle);

  async function idsFavoris(): Promise<Set<string>> {
    const lignes = verifier(await client.from('favoris').select('extra_id')) as { extra_id: string }[];
    return new Set(lignes.map((f) => f.extra_id));
  }

  const source = {
    client,
    async restaurant() {
      const r = verifier(
        await client
          .from('restaurants')
          .select('id, nom, telephone, adresse, code_postal, commune, lat, lng')
          .single(),
      ) as {
        id: string;
        nom: string;
        telephone: string | null;
        adresse: string | null;
        code_postal: string | null;
        commune: string | null;
        lat: number | null;
        lng: number | null;
      };
      return {
        id: r.id,
        nom: r.nom,
        telephone: r.telephone,
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
      const [lignes, favoris] = await Promise.all([
        client.from('demandes').select(SELECTION).order('jour', { ascending: false }).order('debut'),
        idsFavoris(),
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
      verifier(await client.from('favoris').delete().eq('extra_id', extraId));
    },
    async factures(): Promise<Facture[]> {
      const lignes = verifier(await client.rpc('factures_restaurant')) as {
        mois: string;
        mises_en_relation: number;
        montant_ht_centimes: number;
        tva_pour_mille: number;
      }[];
      return lignes.map((f) => ({
        mois: f.mois,
        numero: `KDM-${f.mois.replace('-', '')}`,
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
  } satisfies SourceResto & { client: SupabaseClient };
  return source;
}
