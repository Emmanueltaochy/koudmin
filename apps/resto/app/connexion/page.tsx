'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { envoyerCode, verifierCode } from '@/lib/auth';
import s from './connexion.module.css';

const tc = textesEcrans.connexion;

export default function Connexion() {
  const router = useRouter();
  const [etape, setEtape] = useState<'numero' | 'code'>('numero');
  const [telephone, setTelephone] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      if (etape === 'numero') {
        if ((await envoyerCode(telephone)) === 'numero') setErreur(tc.erreurTelephone);
        else setEtape('code');
      } else if (await verifierCode(telephone, code)) {
        router.replace('/');
        return;
      } else {
        setErreur(tc.erreurCode);
      }
    } catch {
      setErreur("Le SMS n'est pas parti. Vérifiez la connexion et réessayez.");
    }
    setEnvoi(false);
  }

  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: "auto" }} />
      <h1 className={ui.titre}>{tc.titreResto}</h1>
      <form onSubmit={soumettre} className={s.formulaire} noValidate>
        {etape === 'numero' ? (
          <div className={s.bloc}>
            <label htmlFor="telephone" className={ui.corpsFort}>
              {tc.telephone}
            </label>
            <span className={ui.champ} data-erreur={!!erreur}>
              <input
                id="telephone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0692 12 34 56"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                aria-invalid={!!erreur}
              />
            </span>
            <p className={erreur ? ui.messageErreur : ui.legende} role={erreur ? 'alert' : undefined}>
              {erreur ?? tc.telephoneAide}
            </p>
          </div>
        ) : (
          <div className={s.bloc}>
            <label htmlFor="code" className={ui.corpsFort}>
              {tc.code}
            </label>
            <span className={ui.champ} data-erreur={!!erreur}>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                aria-invalid={!!erreur}
                autoFocus
              />
            </span>
            {erreur && (
              <p className={ui.messageErreur} role="alert">
                {erreur}
              </p>
            )}
            <button type="button" className={ui.lienDiscret} onClick={() => { setEtape('numero'); setCode(''); setErreur(null); }}>
              {tc.autreNumero}
            </button>
          </div>
        )}
        <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
          {envoi && <Spinner />}
          {etape === 'numero' ? tc.envoyerCode : tc.valider}
        </button>
      </form>
    </main>
  );
}
