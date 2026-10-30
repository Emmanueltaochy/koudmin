'use client';

import { useState, type FormEvent } from 'react';
import { emailValide, textesVitrine } from '@kivien/core';
import s from './vitrine.module.css';

const t = textesVitrine.lettre;

/** Inscription à la lettre mensuelle : fonction inscrire_lettre (Supabase), simulée en démonstration. */
async function inscrire(email: string): Promise<'ok' | 'email' | 'reseau'> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) return 'ok';
  try {
    const r = await fetch(`${url}/rest/v1/rpc/inscrire_lettre`, {
      method: 'POST',
      headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: email }),
    });
    if (r.ok) return 'ok';
    return r.status === 400 ? 'email' : 'reseau';
  } catch {
    return 'reseau';
  }
}

export function Lettre() {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'ok'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    const adresse = email.trim();
    if (!emailValide(adresse)) return setErreur(t.erreurEmail);
    setErreur(null);
    setEtat('envoi');
    const r = await inscrire(adresse);
    if (r === 'ok') return setEtat('ok');
    setErreur(r === 'email' ? t.erreurEmail : t.erreurReseau);
    setEtat('saisie');
  }

  if (etat === 'ok') {
    return (
      <div className={s.lettreForm}>
        <p className={s.lettreMerci} role="status">
          {t.merci}
        </p>
      </div>
    );
  }

  return (
    <form className={s.lettreForm} onSubmit={envoyer} noValidate>
      <div className={s.lettreLigne}>
        <label htmlFor="lettre-email" className={s.horsEcran}>
          {t.champ}
        </label>
        <input
          id="lettre-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.champ}
          className={s.lettreChamp}
          data-erreur={!!erreur}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!erreur}
          aria-describedby="lettre-aide"
        />
        <button type="submit" className={s.lettreBouton} disabled={etat === 'envoi'} aria-busy={etat === 'envoi'}>
          {t.bouton}
        </button>
      </div>
      <span id="lettre-aide" className={erreur ? s.lettreErreur : `${s.legende} ${s.galet}`} role={erreur ? 'alert' : undefined}>
        {erreur ?? t.aide}
      </span>
    </form>
  );
}
