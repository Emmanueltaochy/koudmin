import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import {
  aujourdhuiReunion,
  estSecteur,
  prospectsDepuisOverpass,
  REQUETES_OVERPASS,
  SECTEUR_PAR_DEFAUT,
  SERVEURS_OVERPASS,
  type ElementOsm,
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
  type MoyenPaiement,
  type Prospect,
  type PaiementFrais,
  type ReponsePaiement,
  type Restaurant,
  type Role,
  type TableauAdmin,
  type SourceResto,
} from './source';
import { agregerFavoris } from './favoris';

type UnOuPlusieurs<T> = T | T[] | null;
const premier = <T,>(v: UnOuPlusieurs<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

interface LigneDemande {
  id: string;
  restaurant_id: string;
  poste: Poste;
  intitule: string | null;
  description_poste: string | null;
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
    updated_at: string;
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

const SELECTION = `id, restaurant_id, poste, intitule, description_poste, jour, debut, fin, taux_horaire_brut_centimes, frais_mise_en_relation_ht_centimes,
  adresse, code_postal, commune, retour_assure, nb_extras, consignes, statut, created_at,
  affectations ( id, extra_id, statut, created_at, updated_at,
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
    intitule: l.intitule,
    descriptionPoste: l.description_poste,
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
        majLe: a.updated_at,
        contratSigneRestaurant: !!c?.signe_restaurant_le,
        contratSigneExtra: !!c?.signe_extra_le,
        contratSigneExtraLe: c?.signe_extra_le ?? null,
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
  const ecouteurs = new Set<() => void>();
  let canal: RealtimeChannel | null = null;
  const prevenir = () => ecouteurs.forEach((f) => f());

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
    paiement: {
      async moyen(restaurantId) {
        const l = verifier(
          await client
            .from('moyens_paiement')
            .select('mode, carte_libelle, sepa_libelle, gocardless_demande, gocardless_mandat, mandat_statut')
            .eq('restaurant_id', restaurantId)
            .maybeSingle(),
        ) as {
          mode: MoyenPaiement['mode']; carte_libelle: string | null; sepa_libelle: string | null;
          gocardless_demande: string | null; gocardless_mandat: string | null; mandat_statut: string | null;
        } | null;
        const valide = !!l?.mandat_statut && ['pending_customer_approval', 'pending_submission', 'submitted', 'active'].includes(l.mandat_statut);
        return {
          mode: l?.mode ?? 'carte_mission',
          carte: l?.carte_libelle ?? null,
          sepa: l?.gocardless_mandat ? (l.sepa_libelle ?? 'Prélèvement SEPA') : null,
          sepaEnAttente: !!l?.gocardless_demande && !l.gocardless_mandat,
          mandatValide: valide,
        };
      },
      async historique(restaurantId) {
        const l = verifier(
          await client
            .from('paiements')
            .select('id, type, libelle, moyen, montant_ttc_centimes, statut, erreur, cree_le')
            .eq('restaurant_id', restaurantId)
            .order('cree_le', { ascending: false })
            .limit(100),
        ) as { id: string; type: PaiementFrais['type']; libelle: string; moyen: PaiementFrais['moyen']; montant_ttc_centimes: number;
               statut: PaiementFrais['statut']; erreur: string | null; cree_le: string }[];
        return l.map((p) => ({
          id: p.id, type: p.type, libelle: p.libelle, moyen: p.moyen, montantTTCCentimes: p.montant_ttc_centimes,
          statut: p.statut, erreur: p.erreur, creeLe: p.cree_le,
        }));
      },
      async aRegler(restaurantId) {
        const [l] = verifier(await client.rpc('a_regler', { p_restaurant: restaurantId })) as
          { mises_en_relation: number; montant_ht_centimes: number; tva_centimes: number }[];
        return { misesEnRelation: l?.mises_en_relation ?? 0, ttcCentimes: (l?.montant_ht_centimes ?? 0) + (l?.tva_centimes ?? 0) };
      },
      async agir(restaurantId, a) {
        const { data, error } = await client.functions.invoke('paiement', { body: { ...a, restaurant: restaurantId } });
        if (error) {
          // Refus expliqué par la fonction (« Enregistrez d'abord une carte. ») : relu dans la réponse.
          const reponse = (error as { context?: Response }).context;
          const corps = reponse ? ((await reponse.json().catch(() => null)) as { erreur?: string } | null) : null;
          return { erreur: corps?.erreur ?? null, statut: 'echoue' };
        }
        return data as ReponsePaiement;
      },
    },
    admin: {
      async tableau(jours) {
        const { data, error } = await client.rpc('admin_tableau', { p_jours: jours });
        if (refus(error, /administrateurs Kivien/)) return null;
        return verifier({ data, error }) as TableauAdmin;
      },
      async etablissements() {
        const l = verifier(await client.rpc('admin_etablissements')) as {
          id: string; nom: string; commune: string | null; lat: number | null; lng: number | null; secteur: string; siret: string | null;
          telephone: string | null; inscrit_le: string; utilisateurs: number; demandes: number; places_pourvues: number;
          frais_ht_centimes: number; derniere_demande: string | null;
        }[];
        return l.map((r) => ({
          id: r.id, nom: r.nom, commune: r.commune, lat: r.lat, lng: r.lng, secteur: r.secteur, siret: r.siret, telephone: r.telephone,
          inscritLe: r.inscrit_le, utilisateurs: r.utilisateurs, demandes: r.demandes, placesPourvues: r.places_pourvues,
          fraisHTCentimes: r.frais_ht_centimes, derniereDemande: r.derniere_demande,
        }));
      },
      async extras() {
        const l = verifier(await client.rpc('admin_extras')) as {
          id: string; prenom: string; nom: string; telephone: string; commune: string; competences: Poste[] | null; experience: string | null;
          a_voiture: boolean; inscrit_le: string; missions: number; absences: number; desistements: number; note_moyenne: number | null;
          dispo_7_jours: boolean; avec_photo: boolean;
        }[];
        return l.map((e) => ({
          id: e.id, prenom: e.prenom, nom: e.nom, telephone: e.telephone, commune: e.commune, competences: e.competences ?? [],
          experience: e.experience, aVoiture: e.a_voiture, inscritLe: e.inscrit_le, missions: e.missions, absences: e.absences,
          desistements: e.desistements, noteMoyenne: e.note_moyenne === null ? null : Number(e.note_moyenne),
          dispo7Jours: e.dispo_7_jours, avecPhoto: e.avec_photo,
        }));
      },
      prospection: {
        async chercherOsm() {
          // Chaque requête est essayée sur les serveurs publics à la suite (souvent saturés).
          const elements: ElementOsm[] = [];
          for (const requete of REQUETES_OVERPASS) {
            const echecs: string[] = [];
            let reponse: { elements?: ElementOsm[]; remark?: string } | null = null;
            for (const serveur of SERVEURS_OVERPASS) {
              try {
                const r = await fetch(serveur, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: `data=${encodeURIComponent(requete)}`,
                  signal: AbortSignal.timeout(100_000),
                });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const json = (await r.json()) as { elements?: ElementOsm[]; remark?: string };
                // Overpass signale un dépassement de temps dans « remark », avec une liste vide.
                if (json.remark && !json.elements?.length) throw new Error(json.remark.slice(0, 80));
                reponse = json;
                break;
              } catch (e) {
                echecs.push(`${new URL(serveur).host} : ${e instanceof Error ? e.message : 'erreur'}`);
              }
            }
            if (!reponse) throw new ErreurReseau(echecs.join(' ; '));
            elements.push(...(reponse.elements ?? []));
          }
          return prospectsDepuisOverpass({ elements });
        },
        async prospects() {
          const l = verifier(await client.rpc('admin_prospects')) as {
            id: string; nom: string; categorie: Prospect['categorie']; commune: string | null; adresse: string | null;
            lat: number | null; lng: number | null; telephone: string | null; email: string | null; site: string | null;
            statut: Prospect['statut']; notes: string | null; desinscrit: boolean; dernier_envoi: string | null; envois: number;
          }[];
          return l.map((p) => ({
            id: p.id, nom: p.nom, categorie: p.categorie, commune: p.commune, adresse: p.adresse, lat: p.lat, lng: p.lng,
            telephone: p.telephone, email: p.email, site: p.site, statut: p.statut, notes: p.notes, desinscrit: p.desinscrit,
            dernierEnvoi: p.dernier_envoi, envois: p.envois,
          }));
        },
        async importer(fiches) {
          // Par paquets : un import de toute l'île reste sous la taille maximale d'une requête.
          let ajoutes = 0;
          let misAJour = 0;
          for (let i = 0; i < fiches.length; i += 1000) {
            const [r] = verifier(await client.rpc('admin_importer_prospects', { p_lignes: fiches.slice(i, i + 1000) })) as
              { ajoutes: number; mis_a_jour: number }[];
            ajoutes += r?.ajoutes ?? 0;
            misAJour += r?.mis_a_jour ?? 0;
          }
          return { ajoutes, misAJour };
        },
        async modifier(id, m) {
          const { error } = await client.rpc('admin_modifier_prospect', {
            p_id: id, p_email: m.email, p_telephone: m.telephone, p_statut: m.statut, p_notes: m.notes,
          });
          if (error && /e-mail invalide/i.test(error.message)) return 'email';
          verifier({ data: null, error });
          return 'ok';
        },
        async lancerCampagne(sujet, message, ids) {
          return verifier(await client.rpc('admin_lancer_campagne', { p_sujet: sujet, p_message: message, p_prospects: ids })) as number;
        },
        async campagnes() {
          const l = verifier(await client.rpc('admin_campagnes')) as
            { id: string; sujet: string; cree_le: string; total: number; envoyes: number; en_attente: number; echecs: number }[];
          return l.map((c) => ({ id: c.id, sujet: c.sujet, creeLe: c.cree_le, total: c.total, envoyes: c.envoyes, enAttente: c.en_attente, echecs: c.echecs }));
        },
        async seDesinscrire(jeton) {
          return verifier(await client.rpc('se_desinscrire_prospection', { p_jeton: jeton })) as boolean;
        },
      },
      async demandes(limite = 100) {
        const l = verifier(await client.rpc('admin_demandes', { p_limite: limite })) as {
          id: string; etablissement: string; commune: string; poste: Poste; jour: string; debut: number; fin: number; nb_extras: number;
          pourvues: number; statut: StatutDemande; publiee_le: string; delai_minutes: number | null; frais_ht_centimes: number;
          intitule: string | null;
        }[];
        return l.map((d) => ({
          id: d.id, etablissement: d.etablissement, commune: d.commune, poste: d.poste, jour: d.jour, debut: d.debut, fin: d.fin,
          nbExtras: d.nb_extras, pourvues: d.pourvues, statut: d.statut, publieeLe: d.publiee_le, delaiMinutes: d.delai_minutes,
          fraisHTCentimes: d.frais_ht_centimes,
          intitule: d.intitule,
        }));
      },
    },
    async statistiques() {
      const [ex, et] = await Promise.all([client.rpc('statistiques_extras'), client.rpc('statistiques_etablissements')]);
      if (refus(ex.error, /administrateurs Kivien/)) return null;
      const extras = verifier(ex) as {
        commune: string;
        competences: Poste[];
        experience: string | null;
        a_voiture: boolean;
        inscrit_le: string;
        dispo_week_end: boolean;
        dispo_7_jours: boolean;
      }[];
      const etablissements = verifier(et) as { commune: string | null; lat: number | null; lng: number | null; secteur: string; inscrit_le: string; demandes: number }[];
      return {
        extras: extras.map((e) => ({
          commune: e.commune,
          competences: e.competences ?? [],
          experience: e.experience,
          aVoiture: e.a_voiture,
          inscritLe: e.inscrit_le,
          dispoWeekEnd: e.dispo_week_end,
          dispo7Jours: e.dispo_7_jours,
        })),
        etablissements: etablissements.map((r) => ({ commune: r.commune, lat: r.lat, lng: r.lng, secteur: r.secteur, inscritLe: r.inscrit_le, demandes: r.demandes })),
      };
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
            intitule: d.intitule,
            description_poste: d.descriptionPoste,
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
    async signatures(affectationId) {
      const l = verifier(
        await client
          .from('contrats')
          .select('signe_restaurant_le, signature_restaurant, signe_extra_le, signature_extra')
          .eq('affectation_id', affectationId)
          .maybeSingle(),
      ) as { signe_restaurant_le: string | null; signature_restaurant: string | null; signe_extra_le: string | null; signature_extra: string | null } | null;
      return {
        restaurant: l?.signature_restaurant && l.signe_restaurant_le ? { image: l.signature_restaurant, le: l.signe_restaurant_le } : null,
        extra: l?.signature_extra && l.signe_extra_le ? { image: l.signature_extra, le: l.signe_extra_le } : null,
      };
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
      // Un seul canal temps réel pour tous les écrans ouverts (menu et page s'abonnent en même temps).
      ecouteurs.add(rappel);
      canal ??= client
        .channel('suivi-restaurant')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, prevenir)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'affectations' }, prevenir)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contrats' }, prevenir)
        .subscribe();
      return () => {
        ecouteurs.delete(rappel);
        if (ecouteurs.size === 0 && canal) {
          void client.removeChannel(canal);
          canal = null;
        }
      };
    },
  };
  return source;
}
