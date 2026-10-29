import { NBSP } from './espaces';

function groupe(entier: number): string {
  return String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/**
 * 8125 → « 81,25 € ». Avec `decimales: 'auto'`, les euros ronds perdent leurs centimes :
 * 5000 → « 50 € ». Les salaires gardent toujours leurs centimes.
 */
export function formatEuros(
  centimes: number,
  { decimales = 'toujours' }: { decimales?: 'toujours' | 'auto' } = {},
): string {
  const signe = centimes < 0 ? '-' : '';
  const abs = Math.abs(centimes);
  const euros = Math.floor(abs / 100);
  const cts = abs % 100;
  const corps =
    decimales === 'auto' && cts === 0
      ? groupe(euros)
      : `${groupe(euros)},${String(cts).padStart(2, '0')}`;
  return `${signe}${corps}${NBSP}€`;
}

/** 5000 → « 50 € HT » */
export function formatHT(centimes: number): string {
  return `${formatEuros(centimes, { decimales: 'auto' })}${NBSP}HT`;
}

/** 63 → « ≈ 63 € net » */
export function formatNet(euros: number): string {
  return `≈${NBSP}${groupe(euros)}${NBSP}€${NBSP}net`;
}

/** 2100 → « 2,1 km ». Toujours une décimale : 6000 → « 6,0 km ». */
export function formatDistance(metres: number): string {
  const hecto = Math.round(metres / 100);
  return `${Math.floor(hecto / 10)},${hecto % 10}${NBSP}km`;
}
