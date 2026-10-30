'use client';

import { normaliserMobileReunion, type Secteur } from '@kivien/core';
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
  i: { telephone: string; motDePasse: string; etablissement: string; secteur: Secteur; siret: string; adresse: AdresseGeo },
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
  const { resultat } = await source().ajouterEtablissement({ nom: i.etablissement, siret: i.siret, secteur: i.secteur, adresse: i.adresse });
  return resultat;
}

/** Compte connecté sans établissement (inscription interrompue) : l'inscription reprend à l'établissement. */
export async function aUnEtablissement(): Promise<boolean> {
  if (donneesFictives) return true;
  await accepterInvitations();
  return (await source().etablissements()).length > 0;
}

/** Les invitations envoyées au mobile du compte deviennent des accès. Renvoie le nombre d'accès ouverts. */
export async function accepterInvitations(): Promise<number> {
  if (donneesFictives) return 0;
  const { data, error } = await client()!.rpc('accepter_invitations');
  if (error) throw error;
  return (data as number) ?? 0;
}

/**
 * Accès d'une personne invitée : création du compte (ou connexion s'il existe), puis invitations.
 * « aucune » : pas d'invitation pour ce numéro.
 */
export async function rejoindreEtablissement(
  telephone: string,
  motDePasse: string,
): Promise<'ok' | 'numero' | 'identifiants' | 'attente' | 'aucune'> {
  const e164 = normaliserMobileReunion(telephone);
  if (!e164) return 'numero';
  if (donneesFictives) {
    await new Promise((r) => setTimeout(r, 600));
    return e164 === '+262693445566' ? 'ok' : 'aucune';
  }
  const c = client()!;
  const { error } = await c.auth.signUp({ phone: e164, password: motDePasse });
  if (error) {
    if (error.status === 429) return 'attente';
    if (error.code !== 'phone_exists' && error.code !== 'user_already_exists') throw error;
    const r = await connecter(telephone, motDePasse);
    if (r !== 'ok') return r;
  }
  if ((await accepterInvitations()) > 0) return 'ok';
  return (await source().etablissements()).length > 0 ? 'ok' : 'aucune';
}

/** Connexion d'un administrateur de la plateforme (e-mail et mot de passe). */
export async function connecterAdmin(email: string, motDePasse: string): Promise<'ok' | 'identifiants' | 'attente'> {
  if (donneesFictives) return motDePasse === MOT_DE_PASSE_DEMO ? 'ok' : 'identifiants';
  const { error } = await client()!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
  if (!error) return 'ok';
  if (error.status === 429) return 'attente';
  if (error.status === 400 || error.code === 'invalid_credentials') return 'identifiants';
  throw error;
}

/** Démonstration : adresse e-mail du compte, gardée pour la page. */
let emailDemo: { email: string | null; enAttente: string | null } = { email: null, enAttente: null };

/** Adresse e-mail confirmée du compte, et celle en attente de confirmation. */
export async function emailDuCompte(): Promise<{ email: string | null; enAttente: string | null }> {
  if (donneesFictives) return emailDemo;
  const { data } = await client()!.auth.getUser();
  const u = data.user as { email?: string; new_email?: string } | null;
  return { email: u?.email || null, enAttente: u?.new_email || null };
}

/** Ajoute ou change l'adresse e-mail : un lien de confirmation part sur la nouvelle adresse. */
export async function changerEmail(email: string): Promise<'ok' | 'pris'> {
  if (donneesFictives) {
    emailDemo = { ...emailDemo, enAttente: email };
    return 'ok';
  }
  const { error } = await client()!.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/email-confirme` });
  if (!error) return 'ok';
  if (error.code === 'email_exists' || /already/i.test(error.message)) return 'pris';
  throw error;
}

export async function changerMotDePasse(motDePasse: string): Promise<void> {
  if (donneesFictives) return;
  const { error } = await client()!.auth.updateUser({ password: motDePasse });
  if (error) throw error;
}

/** Mot de passe oublié : lien envoyé à l'adresse du compte (sans dire si elle existe). */
export async function demanderNouveauMotDePasse(email: string): Promise<void> {
  if (donneesFictives) return;
  const { error } = await client()!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nouveau-mot-de-passe` });
  if (error && error.status !== 429) throw error;
}
