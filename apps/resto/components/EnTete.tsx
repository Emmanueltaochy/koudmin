'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import { deconnecter } from '@/lib/auth';
import { donneesFictives } from '@/lib/donnees';
import s from './EnTete.module.css';

const LIENS = [
  { href: '/espace', libelle: 'Accueil' },
  { href: '/demande', libelle: 'Trouver un extra' },
  { href: '/historique', libelle: 'Historique' },
  { href: '/historique?onglet=factures', libelle: 'Factures' },
  { href: '/historique?onglet=favoris', libelle: 'Favoris' },
];

function estActif(href: string, chemin: string, onglet: string | null) {
  const [base, requete] = href.split('?');
  if (base !== chemin) return false;
  const ongletLien = requete ? new URLSearchParams(requete).get('onglet') : null;
  return base !== '/historique' || ongletLien === onglet;
}

/** En-tête : « Kivien » à gauche ; menu à droite sur mobile, liens en ligne sur grand écran. */
export function EnTete() {
  const chemin = usePathname();
  const recherche = useSearchParams();
  const onglet = recherche.get('onglet');
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();
  const sortir = async () => {
    await deconnecter();
    router.replace('/connexion');
  };

  useEffect(() => setOuvert(false), [chemin, onglet]);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [ouvert]);

  return (
    <header className={s.entete}>
      <Link href="/espace" className={s.marque} aria-label="Kivien, accueil">
        {/* Logo pilule basalte : version de l'application (le bouton d'action reste le seul piment). */}
        <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" className={s.logo} />
      </Link>
      <nav aria-label="Navigation principale" className={s.navLarge}>
        {LIENS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={s.lien}
            aria-current={estActif(l.href, chemin, onglet) ? 'page' : undefined}
          >
            {l.libelle}
          </Link>
        ))}
        {!donneesFictives && (
          <button type="button" className={s.lien} onClick={sortir}>
            {textesEcrans.connexion.deconnexion}
          </button>
        )}
      </nav>
      <button
        type="button"
        className={s.boutonMenu}
        aria-expanded={ouvert}
        aria-controls="menu-mobile"
        aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        onClick={() => setOuvert((o) => !o)}
      >
        {ouvert ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
      </button>
      {ouvert && (
        <nav id="menu-mobile" aria-label="Navigation principale" className={s.panneau}>
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={s.lienPanneau}
              aria-current={estActif(l.href, chemin, onglet) ? 'page' : undefined}
            >
              {l.libelle}
            </Link>
          ))}
          {!donneesFictives && (
            <button type="button" className={s.lienPanneau} onClick={sortir}>
              {textesEcrans.connexion.deconnexion}
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
