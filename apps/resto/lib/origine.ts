'use client';

import { encoderOrigine, lireOrigine, type OrigineVisite } from '@kivien/core';
import { URL_APP_EXTRA } from './vitrine/liens';

/**
 * Première visite du navigateur (site d'origine, page d'arrivée, campagne), gardée 90 jours puis
 * notée à la création du compte. Les liens vers l'app extra l'emportent (autre adresse, autre stockage).
 */
const CLE = 'kivien_origine';
const DUREE_MS = 90 * 86400e3;

export function origineMemorisee(): OrigineVisite | null {
  try {
    const o = JSON.parse(localStorage.getItem(CLE) ?? 'null') as OrigineVisite | null;
    return o && Date.now() - Date.parse(o.le) < DUREE_MS ? o : null;
  } catch {
    return null;
  }
}

export function memoriserOrigine() {
  try {
    if (origineMemorisee()) return;
    const o = lireOrigine(location.href, document.referrer);
    if (o) localStorage.setItem(CLE, JSON.stringify(o));
  } catch {
    // Stockage refusé (navigation privée) : l'origine ne sera simplement pas connue.
  }
}

/** Au clic sur un lien vers l'app extra, l'origine part dans l'adresse (?origine=…). */
export function suivreLiensApp(): () => void {
  const auClic = (e: MouseEvent) => {
    const lien = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    const o = origineMemorisee();
    if (!lien || !o || !lien.href.startsWith(URL_APP_EXTRA)) return;
    const url = new URL(lien.href);
    if (!url.searchParams.has('origine')) {
      url.searchParams.set('origine', decodeURIComponent(encoderOrigine(o)));
      lien.href = url.toString();
    }
  };
  document.addEventListener('click', auClic, true);
  return () => document.removeEventListener('click', auClic, true);
}
