'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import Link from 'next/link';
import { aUnEtablissement, connecter } from '@/lib/auth';
import s from './connexion.module.css';

const tc = textesEcrans.connexion;

type Erreur = { champ: 'telephone' | 'motDePasse'; message: string };

export default function Connexion() {
  const router = useRouter();
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<Erreur | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!motDePasse) return setErreur({ champ: 'motDePasse', message: tc.erreurMotDePasseVide });
    setEnvoi(true);
    try {
      const r = await connecter(telephone, motDePasse);
      if (r === 'ok') {
        // Compte sans établissement (inscription interrompue) : l'inscription reprend à l'établissement.
        router.replace((await aUnEtablissement()) ? '/espace' : '/inscription/restaurant');
        return;
      }
      setErreur(
        r === 'numero'
          ? { champ: 'telephone', message: tc.erreurTelephone }
          : { champ: 'motDePasse', message: r === 'attente' ? tc.tropDEssais : tc.erreurIdentifiants },
      );
    } catch {
      setErreur({ champ: 'motDePasse', message: tc.pasDeReseau });
    }
    setEnvoi(false);
  }

  const erreurTel = erreur?.champ === 'telephone' ? erreur.message : null;
  const erreurMdp = erreur?.champ === 'motDePasse' ? erreur.message : null;

  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: "auto" }} />
      <h1 className={ui.titre}>{tc.titreResto}</h1>
      <form onSubmit={soumettre} className={s.formulaire} noValidate>
        <div className={s.bloc}>
          <label htmlFor="telephone" className={ui.corpsFort}>
            {tc.telephone}
          </label>
          <span className={ui.champ} data-erreur={!!erreurTel}>
            <input
              id="telephone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder="0692 12 34 56"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              aria-invalid={!!erreurTel}
              aria-describedby="telephone-aide"
            />
          </span>
          <p id="telephone-aide" className={erreurTel ? ui.messageErreur : ui.legende} role={erreurTel ? 'alert' : undefined}>
            {erreurTel ?? tc.telephoneAide}
          </p>
        </div>
        <div className={s.bloc}>
          <label htmlFor="mot-de-passe" className={ui.corpsFort}>
            {tc.motDePasse}
          </label>
          <span className={ui.champ} data-erreur={!!erreurMdp}>
            <input
              id="mot-de-passe"
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              aria-invalid={!!erreurMdp}
              aria-describedby={erreurMdp ? 'mot-de-passe-erreur' : undefined}
            />
          </span>
          {erreurMdp && (
            <p id="mot-de-passe-erreur" className={ui.messageErreur} role="alert">
              {erreurMdp}
            </p>
          )}
        </div>
        <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
          {envoi && <Spinner />}
          {tc.seConnecter}
        </button>
      </form>
      <Link href="/inscription" className={ui.lienDiscret}>
        {textesEcrans.resto.inscription.pasEncoreCompte}
      </Link>
      <Link href="/mot-de-passe-oublie" className={ui.lienDiscret}>
        {textesEcrans.resto.motDePasseOublie.lien}
      </Link>
    </main>
  );
}
