'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { noterPage } from '@/lib/suivi';

/** Pages vues par un visiteur venu d'un e-mail de prospection (rien pour les autres visiteurs). */
export function SuiviPages() {
  const chemin = usePathname();
  useEffect(() => {
    if (!chemin || /^\/(decouvrir|desinscription|admin)/.test(chemin)) return;
    noterPage(chemin);
  }, [chemin]);
  return null;
}
