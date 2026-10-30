'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { MOT_DE_PASSE_MIN, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { rejoindreEtablissement } from '@/lib/auth';
import s from '../inscription/inscription.module.css';

const tv = textesEcrans.resto.invitation;
const ti = textesEcrans.resto.inscription;
const tc = textesEcrans.connexion;

/** Personne invitée par un établissement : elle crée son accès avec le mobile de l'invitation. */
export default function Invitation() {
  const router = useRouter();
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<{ champ: 'telephone' | 'motDePasse' | 'general'; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    if ([...motDePasse].length < MOT_DE_PASSE_MIN) return setErreur({ champ: 'motDePasse', message: ti.erreurMotDePasse });
    setEnvoi(true);
    try {
      const r = await rejoindreEtablissement(telephone, motDePasse);
      if (r === 'ok') return router.replace('/espace');
      setErreur(
        r === 'numero'
          ? { champ: 'telephone', message: tc.erreurTelephone }
          : r === 'aucune'
            ? { champ: 'general', message: tv.aucune }
            : { champ: 'motDePasse', message: r === 'attente' ? tc.tropDEssais : tc.erreurIdentifiants },
      );
    } catch {
      setErreur({ champ: 'general', message: ti.erreurServeur });
    }
    setEnvoi(false);
  }

  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <div className={s.intro}>
        <h1 className={ui.titre}>{tv.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{tv.sousTitre}</p>
      </div>
      <form onSubmit={soumettre} className={s.formulaire} noValidate>
        <div className={s.bloc}>
          <label htmlFor="telephone" className={ui.corpsFort}>
            {ti.telephone}
          </label>
          <span className={ui.champ} data-erreur={erreur?.champ === 'telephone'}>
            <input
              id="telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0692 12 34 56"
              value={telephone}
              disabled={envoi}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </span>
          {erreur?.champ === 'telephone' && <p className={ui.messageErreur}>{erreur.message}</p>}
        </div>
        <div className={s.bloc}>
          <label htmlFor="mot-de-passe" className={ui.corpsFort}>
            {ti.motDePasse}
          </label>
          <span className={ui.champ} data-erreur={erreur?.champ === 'motDePasse'}>
            <input
              id="mot-de-passe"
              type="password"
              autoComplete="new-password"
              value={motDePasse}
              disabled={envoi}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </span>
          <p className={erreur?.champ === 'motDePasse' ? ui.messageErreur : ui.legende}>
            {erreur?.champ === 'motDePasse' ? erreur.message : ti.motDePasseAide}
          </p>
        </div>
        {erreur?.champ === 'general' && (
          <p className={ui.messageErreur} role="alert">
            {erreur.message}
          </p>
        )}
        <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
          {envoi && <Spinner />}
          {tv.bouton}
        </button>
      </form>
      <Link href="/connexion" className={ui.lienDiscret}>
        {ti.dejaCompte}
      </Link>
    </main>
  );
}
