import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { source } from '../donnees';

/**
 * Espace pro dans l'app. Les établissements utilisent le même espace que sur kivien.re, affiché
 * dans l'app (écran /pro). L'app retient qu'elle sert à un établissement pour rouvrir l'espace pro
 * directement au lancement suivant.
 */
export const SITE_PRO = 'https://kivien.re';
const CLE = 'kivien-mode-pro';

// Adresse à ouvrir à la prochaine entrée dans l'écran /pro. Gardée en mémoire seulement, jamais dans
// la route : elle peut porter la session à transmettre.
let depart: string | null = null;

/** Adresse de départ de l'écran /pro (lue une seule fois), l'espace par défaut. */
export function prendreDepart(): string {
  const url = depart ?? `${SITE_PRO}/espace`;
  depart = null;
  return url;
}

export async function modeProActif(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE)) === 'oui';
  } catch {
    return false;
  }
}

export async function noterModePro(actif: boolean): Promise<void> {
  try {
    if (actif) await AsyncStorage.setItem(CLE, 'oui');
    else await AsyncStorage.removeItem(CLE);
  } catch {
    // stockage indisponible : l'app repassera par l'accueil
  }
}

function ouvrir(url: string) {
  // Sur le web (app.kivien.re), l'espace pro est un autre site : on y va dans le même onglet.
  if (Platform.OS === 'web') {
    globalThis.location?.assign(url);
    return;
  }
  depart = url;
  router.replace('/pro' as never);
}

/** Ouvre une page de kivien.re dans l'app (« /pro » : présentation, « /espace » : l'espace). */
export async function ouvrirEspacePro(chemin = '/espace'): Promise<void> {
  if (chemin === '/espace') await noterModePro(true);
  ouvrir(`${SITE_PRO}${chemin}`);
}

/**
 * Compte d'établissement connecté dans l'app : sa session passe à l'espace pro, sans retaper le mot
 * de passe. Les jetons voyagent dans le fragment de l'adresse (après #), qui n'est jamais envoyé au
 * serveur ; la page /connexion/app les range puis les retire de l'adresse.
 */
export async function ouvrirEspaceProAvecSession(): Promise<void> {
  const s = await source.cederSession();
  await noterModePro(true);
  if (!s) return ouvrir(`${SITE_PRO}/connexion`);
  const jetons = new URLSearchParams({
    access_token: s.accessToken,
    refresh_token: s.refreshToken,
  });
  ouvrir(`${SITE_PRO}/connexion/app#${jetons.toString()}`);
}
