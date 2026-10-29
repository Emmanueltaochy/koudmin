/**
 * Calcul des salaires. Tout se fait en entiers (minutes, centimes) pour éviter
 * les erreurs d'arrondi des nombres à virgule.
 *
 * Brut par extra = heures × taux × 1,10, arrondi au centime.
 * Net estimé     = brut × 0,78, arrondi à l'euro.
 * Total demande  = brut par extra (déjà arrondi) × nombre d'extras.
 */

/** Indemnité de congés payés : 10 % du brut. */
export const CONGES_PAYES_POURCENT = 10;
/** Part du brut estimée en net. */
export const NET_SUR_BRUT_POURCENT = 78;

function entierPositif(n: number, nom: string): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${nom} doit être un entier positif`);
}

/** Division entière arrondie au plus proche, demi vers le haut (nombres positifs). */
function divArrondie(num: number, den: number): number {
  return Math.floor((2 * num + den) / (2 * den));
}

export function brutParExtraCentimes(minutes: number, tauxHoraireBrutCentimes: number): number {
  entierPositif(minutes, 'minutes');
  entierPositif(tauxHoraireBrutCentimes, 'tauxHoraireBrutCentimes');
  return divArrondie(minutes * tauxHoraireBrutCentimes * (100 + CONGES_PAYES_POURCENT), 60 * 100);
}

export function netEstimeEuros(brutCentimes: number): number {
  entierPositif(brutCentimes, 'brutCentimes');
  return divArrondie(brutCentimes * NET_SUR_BRUT_POURCENT, 100 * 100);
}

export interface SalaireMission {
  brutCentimes: number;
  netEuros: number;
}

export function salaireMission(minutes: number, tauxHoraireBrutCentimes: number): SalaireMission {
  const brutCentimes = brutParExtraCentimes(minutes, tauxHoraireBrutCentimes);
  return { brutCentimes, netEuros: netEstimeEuros(brutCentimes) };
}

export interface RecapDemande {
  brutParExtraCentimes: number;
  salairesBrutsCentimes: number;
  fraisHTCentimes: number;
}

export function recapDemande(p: {
  minutes: number;
  tauxHoraireBrutCentimes: number;
  nbExtras: number;
  fraisMiseEnRelationHTCentimes: number;
}): RecapDemande {
  entierPositif(p.nbExtras, 'nbExtras');
  entierPositif(p.fraisMiseEnRelationHTCentimes, 'fraisMiseEnRelationHTCentimes');
  const brut = brutParExtraCentimes(p.minutes, p.tauxHoraireBrutCentimes);
  return {
    brutParExtraCentimes: brut,
    salairesBrutsCentimes: brut * p.nbExtras,
    fraisHTCentimes: p.fraisMiseEnRelationHTCentimes * p.nbExtras,
  };
}

/** Le taux saisi par le restaurateur peut monter au-dessus du SMIC, jamais descendre. */
export function tauxAutorise(tauxCentimes: number, smicCentimes: number): boolean {
  return Number.isSafeInteger(tauxCentimes) && tauxCentimes >= smicCentimes;
}
