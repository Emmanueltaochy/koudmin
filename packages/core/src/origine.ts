/**
 * D'où viennent les inscrits : la question « Comment as-tu connu Kivien ? » (facultative, à
 * l'inscription extra) et la première visite du navigateur (site d'origine, page d'arrivée,
 * paramètres utm d'une publicité). Rien de personnel : seulement le nom du site d'origine.
 */

export const CANAUX_CONNU = ['google', 'reseaux', 'ami', 'etablissement', 'autre'] as const;
export type CanalConnu = (typeof CANAUX_CONNU)[number];

export const textesOrigine = {
  question: 'Comment as-tu connu Kivien ?',
  aide: 'Facultatif. Ça nous aide à savoir où parler de Kivien.',
  canaux: {
    google: 'Recherche Google',
    reseaux: 'Réseaux sociaux',
    ami: 'Un ami, un proche',
    etablissement: 'Un établissement',
    autre: 'Autre',
  } satisfies Record<CanalConnu, string>,
  admin: {
    colonne: 'Origine',
    direct: 'Accès direct',
    titreBilan: 'Origine des inscrits',
    bilanVide: 'Aucune origine notée pour l’instant.',
    reponse: 'Réponse',
    sansReponse: 'Sans réponse',
    premiereVisite: 'Première visite',
  },
} as const;

export const estCanalConnu = (v: unknown): v is CanalConnu =>
  typeof v === 'string' && (CANAUX_CONNU as readonly string[]).includes(v);

/** Première visite d'un navigateur sur kivien.re ou app.kivien.re. */
export interface OrigineVisite {
  /** Site d'où vient le visiteur (« google.com »), null en accès direct. */
  referent: string | null;
  /** Première page vue (« /extras »). */
  page: string;
  /** Paramètres d'une campagne (« facebook / pub / lancement »), null sinon. */
  utm: string | null;
  /** Date ISO de la première visite. */
  le: string;
}

const NOS_SITES = /(^|\.)kivien\.re$/;

/** Origine d'une visite à partir de l'adresse de la page et du référent du navigateur. */
export function lireOrigine(
  adresse: string,
  referent: string,
  maintenant: Date = new Date(),
): OrigineVisite | null {
  let url: URL;
  try {
    url = new URL(adresse);
  } catch {
    return null;
  }
  let hote: string | null = null;
  try {
    hote = referent ? new URL(referent).hostname.replace(/^www\./, '').toLowerCase() : null;
  } catch {
    hote = null;
  }
  if (hote && NOS_SITES.test(hote)) hote = null;
  const utm = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((k) => url.searchParams.get(k)?.trim().slice(0, 60))
    .filter(Boolean)
    .join(' / ');
  return {
    referent: hote ? hote.slice(0, 100) : null,
    page: url.pathname.slice(0, 200) || '/',
    utm: utm || null,
    le: maintenant.toISOString(),
  };
}

/** L'origine passe du site à l'app (autre adresse, autre stockage) dans le lien « Je m'inscris ». */
export function encoderOrigine(o: OrigineVisite): string {
  return encodeURIComponent(JSON.stringify([o.referent, o.page, o.utm, o.le]));
}

export function decoderOrigine(texte: string | null | undefined): OrigineVisite | null {
  if (!texte) return null;
  try {
    const [referent, page, utm, le] = JSON.parse(decodeURIComponent(texte)) as unknown[];
    const chaine = (v: unknown, max: number) =>
      typeof v === 'string' && v.length <= max ? v : null;
    const p = chaine(page, 200);
    const d = chaine(le, 40);
    if (!p || !p.startsWith('/') || !d || Number.isNaN(Date.parse(d))) return null;
    return { referent: chaine(referent, 100), page: p, utm: chaine(utm, 200), le: d };
  } catch {
    return null;
  }
}

const NOMS_SITES: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'X'],
];

/** « Google · /extras », « Accès direct · / », « facebook / pub · /pro ». */
export function resumeOrigine(
  o: { referent: string | null; page: string | null; utm: string | null } | null,
): string {
  if (!o) return '–';
  const site = o.referent
    ? (NOMS_SITES.find(([r]) => r.test(o.referent!))?.[1] ?? o.referent)
    : textesOrigine.admin.direct;
  return [o.utm ?? site, o.page].filter(Boolean).join(' · ');
}
