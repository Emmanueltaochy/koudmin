import Link from 'next/link';
import { textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { URL_APP_EXTRA } from '@/lib/vitrine/liens';
import s from '../inscription/inscription.module.css';

const tm = textesEcrans.resto.motDePasseOublie;

/** Retour du lien de confirmation d'adresse e-mail (établissements et extras). */
export default function EmailConfirme() {
  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <div className={s.intro}>
        <h1 className={ui.titre}>{tm.emailConfirmeTitre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{tm.emailConfirmeTexte}</p>
      </div>
      <Link href="/espace" className={ui.boutonPrincipal}>
        {tm.versEspace}
      </Link>
      <a href={URL_APP_EXTRA} className={ui.boutonSecondaire}>
        {tm.versApp}
      </a>
    </main>
  );
}
