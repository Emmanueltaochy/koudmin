import { sourceFictive } from './fictif';
import { sourceSupabase } from './supabase';
import type { SourceDonnees } from './source';

export * from './source';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cle = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Données fictives tant que Supabase n'est pas configuré. */
export const donneesFictives = !(url && cle);

/** Supabase si configuré, sinon données fictives. */
export const source: SourceDonnees = donneesFictives ? sourceFictive() : sourceSupabase(url!, cle!);

/**
 * États forcés (`?demo=…`) pour la démo et les captures. Ignorés dès que Supabase est
 * branché : une démo ne doit jamais déclencher une vraie acceptation ou un vrai désistement.
 */
export function demoAutorisee<T extends string>(demo: T | undefined): T | undefined {
  return donneesFictives ? demo : undefined;
}
