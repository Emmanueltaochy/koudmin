import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { trouverCommune, type MissionResume, type Poste } from '@kivien/core';
import {
  ErreurReseau,
  type CleDispo,
  type ContratExtra,
  type MissionConfirmee,
  type MissionDetail,
  type Profil,
  type ReponseAcceptation,
  type SourceDonnees,
} from './source';

interface LigneMission {
  id: string;
  restaurant: string;
  commune: string;
  distance_metres: number;
  poste: Poste;
  jour: string;
  debut: number;
  fin: number;
  taux_horaire_brut_centimes: number;
  retour_assure: boolean;
  bus_retour: number | null;
}

interface LigneDetail extends LigneMission {
  tenue: string | null;
  confirmee: boolean;
  disponible: boolean;
  adresse: string | null;
  code_postal: string | null;
  acces: string | null;
  telephone: string | null;
  lat: number | null;
  lng: number | null;
}

const versMission = (l: LigneMission): MissionResume => ({
  id: l.id,
  restaurant: l.restaurant,
  commune: l.commune,
  distanceMetres: l.distance_metres,
  poste: l.poste,
  jour: l.jour,
  debut: l.debut,
  fin: l.fin,
  tauxHoraireBrutCentimes: l.taux_horaire_brut_centimes,
  retourAssure: l.retour_assure,
  busRetour: l.bus_retour,
});

const versDetail = (l: LigneDetail): MissionDetail => ({
  ...versMission(l),
  tenue: l.tenue,
  confirmee: l.confirmee,
  disponible: l.disponible,
  lieu:
    l.adresse !== null && l.lat !== null && l.lng !== null
      ? { adresse: l.adresse, codePostal: l.code_postal, acces: l.acces, telephone: l.telephone, lat: l.lat, lng: l.lng }
      : null,
});

function verifier<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) {
    // supabase-js remonte les coupures réseau comme « TypeError: Network request failed ».
    if (/network|fetch/i.test(r.error.message)) throw new ErreurReseau(r.error.message);
    throw new Error(r.error.message);
  }
  return r.data as T;
}

export function sourceSupabase(url: string, cle: string): SourceDonnees {
  const client: SupabaseClient = createClient(url, cle, {
    auth: {
      // Session gardée sur le téléphone : pas de mot de passe à chaque ouverture.
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Rafraîchissement du jeton seulement app au premier plan (économie de batterie).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (etat) => {
      if (etat === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
  }

  const moi = async () => {
    const { data } = await client.auth.getUser();
    if (!data.user) throw new Error('Session absente');
    return data.user.id;
  };

  return {
    async profil(): Promise<Profil> {
      const p = verifier(
        await client
          .from('extras')
          .select('prenom, nom, telephone, commune, a_voiture, competences, experience, langues, presentation')
          .eq('id', await moi())
          .single<{
            prenom: string;
            nom: string;
            telephone: string;
            commune: string;
            a_voiture: boolean;
            competences: Profil['competences'];
            experience: Profil['experience'];
            langues: Profil['langues'];
            presentation: string;
          }>(),
      );
      return {
        prenom: p.prenom,
        nom: p.nom,
        telephone: p.telephone,
        commune: p.commune,
        aVoiture: p.a_voiture,
        competences: p.competences,
        experience: p.experience,
        langues: p.langues,
        presentation: p.presentation,
      };
    },
    async missions() {
      return (verifier(await client.rpc('missions_disponibles')) as LigneMission[]).map(versMission);
    },
    async detail(id) {
      const lignes = verifier(await client.rpc('detail_mission', { p_demande: id })) as LigneDetail[];
      return lignes[0] ? versDetail(lignes[0]) : null;
    },
    async accepter(id) {
      return verifier(await client.rpc('accepter_mission', { p_demande: id })) as ReponseAcceptation;
    },
    async seDesister(id) {
      verifier(await client.rpc('se_desister', { p_demande: id }));
    },
    ecouterMissions(rappel) {
      const canal = client
        .channel('signaux_missions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signaux_missions' }, rappel)
        .subscribe();
      return () => {
        void client.removeChannel(canal);
      };
    },
    async mesMissions(): Promise<MissionConfirmee[]> {
      const lignes = verifier(await client.rpc('mes_missions')) as (LigneMission & { contrat_signe: boolean })[];
      return lignes.map((l) => ({ ...versMission(l), contratSigne: l.contrat_signe }));
    },
    async contrat(demandeId): Promise<ContratExtra | null> {
      const lignes = verifier(await client.rpc('contrat_extra', { p_demande: demandeId })) as {
        affectation_id: string;
        employeur: string;
        adresse_employeur: string;
        signe_extra: boolean;
        signe_restaurant: boolean;
      }[];
      const l = lignes[0];
      return l
        ? {
            affectationId: l.affectation_id,
            employeur: l.employeur,
            adresseEmployeur: l.adresse_employeur,
            signeExtra: l.signe_extra,
            signeRestaurant: l.signe_restaurant,
          }
        : null;
    },
    async infosContrat() {
      const l = verifier(
        await client.from('infos_contrat').select('date_naissance, lieu_naissance, nir, adresse').maybeSingle<{
          date_naissance: string;
          lieu_naissance: string;
          nir: string;
          adresse: string;
        }>(),
      );
      return l ? { dateNaissance: l.date_naissance, lieuNaissance: l.lieu_naissance, nir: l.nir, adresse: l.adresse } : null;
    },
    async enregistrerInfosContrat(i) {
      verifier(
        await client.from('infos_contrat').upsert({
          extra_id: await moi(),
          date_naissance: i.dateNaissance,
          lieu_naissance: i.lieuNaissance.trim(),
          nir: i.nir.replace(/\s/g, '').toUpperCase(),
          adresse: i.adresse.trim(),
          updated_at: new Date().toISOString(),
        }),
      );
    },
    async signerContrat(affectationId, signature) {
      verifier(await client.rpc('signer_contrat', { p_affectation: affectationId, p_signature: signature }));
    },
    async dispos() {
      const lignes = verifier(await client.from('disponibilites').select('jour, creneau')) as { jour: string; creneau: 'midi' | 'soir' }[];
      return lignes.map((l) => `${l.jour}:${l.creneau}` as CleDispo);
    },
    async basculerDispo(jour, creneau, actif) {
      const extra_id = await moi();
      if (actif) verifier(await client.from('disponibilites').upsert({ extra_id, jour, creneau }));
      else verifier(await client.from('disponibilites').delete().match({ extra_id, jour, creneau }));
    },
    async majProfil(p) {
      const maj: Record<string, unknown> = {};
      if (p.aVoiture !== undefined) maj.a_voiture = p.aVoiture;
      if (p.competences !== undefined) maj.competences = p.competences;
      if (p.experience !== undefined) maj.experience = p.experience;
      if (p.langues !== undefined) maj.langues = p.langues;
      if (p.presentation !== undefined) maj.presentation = p.presentation;
      if (Object.keys(maj).length) verifier(await client.from('extras').update(maj).eq('id', await moi()));
    },
    async maPhoto() {
      return verifier(await client.rpc('photo_extra', { p_extra: await moi() })) as string | null;
    },
    async enregistrerPhoto(jpeg) {
      verifier(await client.rpc('enregistrer_photo', { p_jpeg_base64: jpeg }));
    },
    async supprimerPhoto() {
      verifier(await client.rpc('supprimer_photo'));
    },
    async session() {
      const { data } = await client.auth.getSession();
      if (!data.session) return 'aucune';
      const { count } = await client.from('extras').select('id', { count: 'exact', head: true });
      return count ? 'ok' : 'sansProfil';
    },
    async connecter(telephone, motDePasse) {
      const { error } = await client.auth.signInWithPassword({ phone: telephone, password: motDePasse });
      if (!error) return 'ok';
      if (error.status === 400 || error.code === 'invalid_credentials') return 'identifiants';
      if (error.status === 429) return 'attente';
      throw /network|fetch/i.test(error.message) ? new ErreurReseau(error.message) : error;
    },
    async creerCompte(telephone, motDePasse) {
      const { data, error } = await client.auth.signUp({ phone: telephone, password: motDePasse });
      if (error) {
        if (error.code === 'phone_exists' || error.code === 'user_already_exists') return 'dejaInscrit';
        if (error.status === 429) return 'attente';
        throw /network|fetch/i.test(error.message) ? new ErreurReseau(error.message) : error;
      }
      // Sans session, le serveur attend une vérification par SMS (fournisseur configuré) : non géré ici.
      if (!data.session) throw new Error('Compte créé sans session : vérification du numéro requise');
      return 'ok';
    },
    async inscrire(i) {
      const c = trouverCommune(i.commune);
      if (!c) throw new Error('Commune inconnue');
      verifier(
        await client.from('extras').upsert({
          id: await moi(),
          prenom: i.prenom.trim(),
          nom: i.nom.trim(),
          telephone: i.telephone,
          commune: c.nom,
          lat: c.lat,
          lng: c.lng,
          a_voiture: i.aVoiture,
        }),
      );
    },
    async deconnecter() {
      await client.auth.signOut();
    },
  };
}
