'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { textesVitrine } from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { source } from '@/lib/donnees';
import s from '../inscription/inscription.module.css';

const td = textesVitrine.desinscription;

/** Lien de désinscription des e-mails de présentation (prospection) : effet immédiat, sans compte. */
export default function Desinscription() {
  const [etat, setEtat] = useState<'enCours' | 'ok' | 'inconnu'>('enCours');
  useEffect(() => {
    const jeton = new URLSearchParams(window.location.search).get('j') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(jeton) && jeton !== 'demo') return setEtat('inconnu');
    source()
      .admin.prospection.seDesinscrire(jeton)
      .then((ok) => setEtat(ok ? 'ok' : 'inconnu'))
      .catch(() => setEtat('inconnu'));
  }, []);
  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <div className={s.intro}>
        <h1 className={ui.titre}>{td.titre}</h1>
        <p className={ui.corps} role="status">{td[etat]}</p>
      </div>
      <Link href="/" className={ui.boutonSecondaire}>{td.retour}</Link>
    </main>
  );
}
