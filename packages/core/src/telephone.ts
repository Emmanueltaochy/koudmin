/**
 * Numéros mobiles réunionnais : 0692 / 0693, indicatif +262.
 * Format stocké (Supabase Auth) : E.164 « +262692123456 ».
 */
const MOBILE_REUNION = /^69[23]\d{6}$/;

/** Accepte « 0692 12 34 56 », « +262 692 12 34 56 », « 00262692123456 », « +2620692… ». */
export function normaliserMobileReunion(saisie: string): string | null {
  let n = saisie.replace(/[\s.\-()]/g, '');
  if (n.startsWith('+262')) n = n.slice(4);
  else if (n.startsWith('00262')) n = n.slice(5);
  else if (n.startsWith('262') && n.length === 12) n = n.slice(3);
  if (n.startsWith('0')) n = n.slice(1);
  return MOBILE_REUNION.test(n) ? `+262${n}` : null;
}

/** « +262692123456 » → « 0692 12 34 56 » */
export function formatMobileReunion(e164: string): string {
  const n = normaliserMobileReunion(e164);
  if (!n) return e164;
  const national = '0' + n.slice(4);
  return `${national.slice(0, 4)} ${national.slice(4, 6)} ${national.slice(6, 8)} ${national.slice(8)}`;
}
