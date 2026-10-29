'use client';

import { normaliserMobileReunion } from '@kivien/core';
import { donneesFictives, source } from './donnees';
import type { SupabaseClient } from '@supabase/supabase-js';

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
