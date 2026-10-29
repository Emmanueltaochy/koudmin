'use client';

import { normaliserMobileReunion } from '@koudmin/core';
import { donneesFictives, source } from './donnees';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Code accepté en démonstration, comme les numéros de test de supabase/config.toml. */
const CODE_DEMO = '123456';

function client(): SupabaseClient | null {
  const s = source() as unknown as { client?: SupabaseClient };
  return s.client ?? null;
}

export async function connecte(): Promise<boolean> {
  if (donneesFictives) return true;
  const { data } = await client()!.auth.getSession();
  return !!data.session;
}

export async function envoyerCode(telephone: string): Promise<'ok' | 'numero'> {
  const e164 = normaliserMobileReunion(telephone);
  if (!e164) return 'numero';
  if (donneesFictives) return 'ok';
  const { error } = await client()!.auth.signInWithOtp({ phone: e164 });
  if (error) throw error;
  return 'ok';
}

export async function verifierCode(telephone: string, code: string): Promise<boolean> {
  const e164 = normaliserMobileReunion(telephone);
  if (!e164) return false;
  if (donneesFictives) return code.trim() === CODE_DEMO;
  const { error } = await client()!.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'sms' });
  return !error;
}

export async function deconnecter(): Promise<void> {
  if (!donneesFictives) await client()!.auth.signOut();
}
