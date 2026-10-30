'use client';

import { sourceFictive } from './fictif';
import { sourceSupabase } from './supabase';
import type { SourceResto } from './source';

export * from './source';
export { choisirEtablissement, ecouterEtablissement } from './etablissementCourant';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Données fictives tant que Supabase n'est pas configuré. */
export const donneesFictives = !(url && cle);

let instance: SourceResto | null = null;

/** Source unique côté navigateur. */
export function source(): SourceResto {
  instance ??= donneesFictives ? sourceFictive() : sourceSupabase(url!, cle!);
  return instance;
}
