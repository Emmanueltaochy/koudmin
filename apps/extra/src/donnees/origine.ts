import { Platform } from 'react-native';
import { decoderOrigine, lireOrigine, type OrigineVisite } from '@kivien/core';

/**
 * Première visite de l'app web (app.kivien.re), gardée 90 jours puis notée à l'inscription.
 * Venu du site, l'origine arrive dans l'adresse (?origine=…) : c'est elle qui compte.
 * Dans l'app installée (iPhone, Android), rien n'est noté ici.
 */
const CLE = 'kivien_origine';
const DUREE_MS = 90 * 86400e3;

export function origineMemorisee(): OrigineVisite | null {
  if (Platform.OS !== 'web') return null;
  try {
    const o = JSON.parse(localStorage.getItem(CLE) ?? 'null') as OrigineVisite | null;
    return o && Date.now() - Date.parse(o.le) < DUREE_MS ? o : null;
  } catch {
    return null;
  }
}

export function memoriserOrigine() {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return;
  try {
    const venueDuSite = decoderOrigine(
      encodeURIComponent(new URL(location.href).searchParams.get('origine') ?? ''),
    );
    if (origineMemorisee() && !venueDuSite) return;
    const o = venueDuSite ?? lireOrigine(location.href, document.referrer);
    if (o && !origineMemorisee()) localStorage.setItem(CLE, JSON.stringify(o));
  } catch {
    // Stockage refusé (navigation privée) : l'origine ne sera simplement pas connue.
  }
}
