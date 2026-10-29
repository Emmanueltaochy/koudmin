import { sourceFictive } from './fictif';
import { sourceSupabase } from './supabase';
import type { SourceDonnees } from './source';

export * from './source';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cle = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase si configuré, sinon données fictives. */
export const source: SourceDonnees = url && cle ? sourceSupabase(url, cle) : sourceFictive();
