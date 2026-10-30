'use client';

import { normaliserMobileReunion } from '@kivien/core';
import { donneesFictives, source } from './donnees';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdresseGeo } from './adresse';

/** Mot de passe accepté en démonstration (données fictives). */
const MOT_DE_PASSE_DEMO = 'kivien974';

function client(): SupabaseClient | null {
  const s = source() as unknown as { client?: SupabaseClient };
  return s.client ?? null;
}

export async function connecte(): Promise<boolean> {
  if (donneesFictives) return true;
  const { data } = await client()!.auth.getSession();
  return !!data.session;
}

/** Connexion par mobile et mot de passe. Lève une erreur en cas de coupure réseau. */
export async function connecter(telephone: string, motDePasse: string): Promise<'ok' | 'numero' | 'identifiants' | 'attente'> {
  const e164 = normaliserMobileReunion(telephone);
  if (!e164) return 'numero';
  if (donneesFictives) return motDePasse === MOT_DE_PASSE_DEMO ? 'ok' : 'identifiants';
  const { error } = await client()!.auth.signInWithPassword({ phone: e164, password: motDePasse });
  if (!error) return 'ok';
  if (error.status === 400 || error.code === 'invalid_credentials') return 'identifiants';
  if (error.status === 429) return 'attente';
  throw error;
}

export async function deconnecter(): Promise<void> {
  if (!donneesFictives) await client()!.auth.signOut();
}

export type ResultatInscription = 'ok' | 'numero' | 'attente' | 'siret' | 'siretInvalide' | 'extra' | 'adresse';

/**
 * Inscription d'un restaurateur : compte (mobile + mot de passe), puis établissement.
 * `compteOuvert` : la session existe déjà (compte créé, établissement à créer), on ne recrée pas le compte.
 * Lève une erreur en cas de coupure réseau ou de refus inattendu du serveur.
 */
export async function inscrireRestaurateur(
  i: { telephone: string; motDePasse: string; etablissement: string; siret: string; adresse: AdresseGeo },
  compteOuvert: boolean,
): Promise<ResultatInscription> {
  if (donneesFictives) {
    await new Promise((r) => setTimeout(r, 800));
    return normaliserMobileReunion(i.telephone)?.endsWith('01') ? 'numero' : 'ok';
  }
  const c = client()!;
  if (!compteOuvert) {
    const e164 = normaliserMobileReunion(i.telephone);
    if (!e164) return 'numero';
    const { data, error } = await c.auth.signUp({ phone: e164, password: i.motDePasse });
    if (error) {
      if (error.code === 'phone_exists' || error.code === 'user_already_exists') return 'numero';
      if (error.status === 429) return 'attente';
      throw error;
    }
    if (!data.session) throw new Error('Compte créé sans session : vérification du numéro requise');
  }
  const { error } = await c.rpc('creer_restaurant', {
    p_nom: i.etablissement,
    p_siret: i.siret,
    p_adresse: i.adresse.voie,
    p_code_postal: i.adresse.codePostal,
    p_commune: i.adresse.commune,
    p_lat: i.adresse.lat,
    p_lng: i.adresse.lng,
  });
  if (!error) return 'ok';
  if (/déjà un établissement/.test(error.message)) return 'ok';
  if (/SIRET déjà inscrit/.test(error.message)) return 'siret';
  if (/SIRET invalide/.test(error.message)) return 'siretInvalide';
  if (/compte extra/.test(error.message)) return 'extra';
  if (/hors de La Réunion/.test(error.message)) return 'adresse';
  throw error;
}

/** Compte connecté sans établissement (inscription interrompue) : l'inscription reprend à l'établissement. */
export async function aUnEtablissement(): Promise<boolean> {
  if (donneesFictives) return true;
  const { count, error } = await client()!.from('restaurants').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}
