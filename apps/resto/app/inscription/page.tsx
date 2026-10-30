import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { URL_APP_EXTRA } from '@/lib/vitrine/liens';
import s from './inscription.module.css';

const ti = textesEcrans.resto.inscription;

export const metadata: Metadata = { title: ti.choixTitre };

/** Choix du type de compte : restaurateur (ici) ou extra (app). */
export default function ChoixCompte() {
  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <h1 className={ui.titre}>{ti.choixTitre}</h1>
      <div className={s.choix}>
        <Link href="/inscription/restaurant" className={s.carteChoix}>
          <span className={s.carteTexte}>
            <span className={ui.sousTitre}>{ti.choixRestaurant}</span>
            <span className={`${ui.corps} ${ui.galet}`}>{ti.choixRestaurantTexte}</span>
          </span>
          <ChevronRight size={24} strokeWidth={2} aria-hidden />
        </Link>
        <a href={`${URL_APP_EXTRA}/bienvenue`} className={s.carteChoix}>
          <span className={s.carteTexte}>
            <span className={ui.sousTitre}>{ti.choixExtra}</span>
            <span className={`${ui.corps} ${ui.galet}`}>{ti.choixExtraTexte}</span>
          </span>
          <ChevronRight size={24} strokeWidth={2} aria-hidden />
        </a>
      </div>
      <Link href="/connexion" className={ui.lienDiscret}>
        {ti.dejaCompte}
      </Link>
    </main>
  );
}
