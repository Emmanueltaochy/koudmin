'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import p from '@/components/pages.module.css';
import { ouvrirSession } from '@/lib/auth';

/**
 * Arrivée depuis l'app mobile : un compte d'établissement connecté dans l'app passe sa session à
 * l'espace pro, sans retaper son mot de passe. Les jetons arrivent dans le fragment de l'adresse
 * (après #, jamais envoyé au serveur) et en sont retirés aussitôt. Sans jeton valable : connexion.
 */
export default function ConnexionApp() {
  const router = useRouter();
  useEffect(() => {
    const jetons = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);
    void ouvrirSession(jetons.get('access_token'), jetons.get('refresh_token'))
      .catch(() => false)
      .then((ouverte) => router.replace(ouverte ? '/espace' : '/connexion'));
  }, [router]);
  return (
    <div className={p.page} aria-busy="true">
      <div className={p.squelette} />
    </div>
  );
}
