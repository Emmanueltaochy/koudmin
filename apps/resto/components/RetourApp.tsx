'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import { dansAppMobile, revenirAccueilApp } from '@/lib/appMobile';

/**
 * Dans l'app mobile seulement : retour à l'accueil de l'app. L'espace pro y est affiché sans barre
 * de l'app (un seul en-tête, celui du site), ce bouton est donc la sortie.
 */
export function RetourApp({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(dansAppMobile()), []);
  if (!visible) return null;
  return (
    <button type="button" className={className} onClick={revenirAccueilApp}>
      <ArrowLeft size={20} strokeWidth={2} aria-hidden />
      {textesEcrans.proApp.retourAccueil}
    </button>
  );
}
