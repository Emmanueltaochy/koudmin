'use client';

import { useEffect, useState } from 'react';

/** Événement de Chrome et Edge quand l'application peut être installée. */
interface InvitationInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * installable : le navigateur propose l'installation (Chrome, Edge) ; installee : ouvert comme une
 * application ; safari, ios : installation par le menu du navigateur ; autre : navigateur sans
 * installation ; masquee : dans l'app mobile Kivien, rien à installer.
 */
export type EtatInstallation = 'installable' | 'installee' | 'safari' | 'ios' | 'autre' | 'masquee';

let invitation: InvitationInstallation | null = null;
let installee = false;
const ecouteurs = new Set<() => void>();
const prevenir = () => ecouteurs.forEach((f) => f());

/** À appeler une fois au chargement du site : service worker et écoute de l'invitation. */
export function preparerInstallation(): () => void {
  if (/KivienApp/.test(navigator.userAgent)) return () => undefined;
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  const noter = (e: Event) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    prevenir();
  };
  const finie = () => {
    invitation = null;
    installee = true;
    prevenir();
  };
  window.addEventListener('beforeinstallprompt', noter);
  window.addEventListener('appinstalled', finie);
  return () => {
    window.removeEventListener('beforeinstallprompt', noter);
    window.removeEventListener('appinstalled', finie);
  };
}

function lire(): EtatInstallation {
  const ua = navigator.userAgent;
  if (/KivienApp/.test(ua)) return 'masquee';
  const autonome =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (installee || autonome) return 'installee';
  if (invitation) return 'installable';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua)) return 'safari';
  return 'autre';
}

/** État de l'installation dans ce navigateur, et l'action pour l'installer quand c'est possible. */
export function useInstallation(): {
  etat: EtatInstallation | null;
  installer: () => Promise<void>;
} {
  const [etat, setEtat] = useState<EtatInstallation | null>(null);
  useEffect(() => {
    const maj = () => setEtat(lire());
    maj();
    ecouteurs.add(maj);
    return () => {
      ecouteurs.delete(maj);
    };
  }, []);
  async function installer() {
    if (!invitation) return;
    await invitation.prompt();
    const choix = await invitation.userChoice.catch(() => null);
    invitation = null;
    if (choix?.outcome === 'accepted') installee = true;
    prevenir();
  }
  return { etat, installer };
}
