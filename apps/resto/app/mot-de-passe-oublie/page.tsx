'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { emailValide, normaliserEmail, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { demanderNouveauMotDePasse } from '@/lib/auth';
import s from '../inscription/inscription.module.css';

const tm = textesEcrans.resto.motDePasseOublie;
const tc = textesEcrans.resto.compte;

/** Mot de passe oublié (établissements et extras) : lien envoyé à l'adresse e-mail du compte. */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!emailValide(email)) return setErreur(tc.erreurEmail);
    setErreur(null);
    setEtat('envoi');
    try {
      await demanderNouveauMotDePasse(normaliserEmail(email));
      setEtat('envoye');
    } catch {
      setErreur(textesEcrans.connexion.pasDeReseau);
      setEtat('saisie');
    }
  }

  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <div className={s.intro}>
        <h1 className={ui.titre}>{tm.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{tm.texte}</p>
      </div>
      {etat === 'envoye' ? (
        <p className={ui.bandeauVacoa} role="status">
          {tm.envoye}
        </p>
      ) : (
        <form onSubmit={envoyer} className={s.formulaire} noValidate>
          <div className={s.bloc}>
            <label htmlFor="email" className={ui.corpsFort}>
              {tc.email}
            </label>
            <span className={ui.champ} data-erreur={!!erreur}>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={etat === 'envoi'} />
            </span>
            {erreur && (
              <p className={ui.messageErreur} role="alert">
                {erreur}
              </p>
            )}
          </div>
          <button type="submit" className={ui.boutonPrincipal} aria-busy={etat === 'envoi'} disabled={etat === 'envoi'}>
            {etat === 'envoi' && <Spinner />}
            {tm.bouton}
          </button>
        </form>
      )}
      <p className={`${ui.legende} ${ui.galet}`}>{tm.sansEmail}</p>
      <Link href="/connexion" className={ui.lienDiscret}>
        {textesEcrans.resto.inscription.dejaCompte}
      </Link>
    </main>
  );
}
