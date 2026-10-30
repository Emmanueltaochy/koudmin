'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { MOT_DE_PASSE_MIN, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { changerMotDePasse, connecte } from '@/lib/auth';
import { URL_APP_EXTRA } from '@/lib/vitrine/liens';
import s from '../inscription/inscription.module.css';

const tm = textesEcrans.resto.motDePasseOublie;
const tc = textesEcrans.resto.compte;

/** Arrivée par le lien de l'e-mail « mot de passe oublié » : la session vient du lien. */
export default function NouveauMotDePasse() {
  const [etat, setEtat] = useState<'verification' | 'saisie' | 'envoi' | 'fait' | 'expire'>('verification');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    // Le client lit le jeton dans l'adresse du lien ; un court délai lui laisse le temps de l'enregistrer.
    const t = setTimeout(() => void connecte().then((c) => setEtat(c ? 'saisie' : 'expire')), 600);
    return () => clearTimeout(t);
  }, []);

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if ([...motDePasse].length < MOT_DE_PASSE_MIN) return setErreur(textesEcrans.resto.inscription.erreurMotDePasse);
    setErreur(null);
    setEtat('envoi');
    try {
      await changerMotDePasse(motDePasse);
      setEtat('fait');
    } catch {
      setErreur(tc.erreur);
      setEtat('saisie');
    }
  }

  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <h1 className={ui.titre}>{tm.nouveauTitre}</h1>
      {etat === 'verification' && <div className={p.squelette} aria-busy />}
      {etat === 'expire' && (
        <>
          <p className={ui.encadreErreur}>{tm.lienExpire}</p>
          <Link href="/mot-de-passe-oublie" className={ui.boutonPrincipal}>
            {tm.bouton}
          </Link>
        </>
      )}
      {etat === 'fait' && (
        <>
          <p className={ui.bandeauVacoa} role="status">
            {tm.fait}
          </p>
          <Link href="/espace" className={ui.boutonPrincipal}>
            {tm.versEspace}
          </Link>
          <a href={URL_APP_EXTRA} className={ui.boutonSecondaire}>
            {tm.versApp}
          </a>
        </>
      )}
      {(etat === 'saisie' || etat === 'envoi') && (
        <form onSubmit={enregistrer} className={s.formulaire} noValidate>
          <p className={`${ui.corps} ${ui.galet}`}>{tm.nouveauTexte}</p>
          <div className={s.bloc}>
            <label htmlFor="mot-de-passe" className={ui.corpsFort}>
              {tc.motDePasse}
            </label>
            <span className={ui.champ} data-erreur={!!erreur}>
              <input
                id="mot-de-passe"
                type="password"
                autoComplete="new-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                disabled={etat === 'envoi'}
              />
            </span>
            <p className={erreur ? ui.messageErreur : ui.legende}>{erreur ?? tc.motDePasseAide}</p>
          </div>
          <button type="submit" className={ui.boutonPrincipal} aria-busy={etat === 'envoi'} disabled={etat === 'envoi'}>
            {etat === 'envoi' && <Spinner />}
            {tm.nouveauBouton}
          </button>
        </form>
      )}
    </main>
  );
}
