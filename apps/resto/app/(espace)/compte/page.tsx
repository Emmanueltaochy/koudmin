'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Mail } from 'lucide-react';
import { emailValide, MOT_DE_PASSE_MIN, normaliserEmail, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { changerEmail, changerMotDePasse, emailDuCompte } from '@/lib/auth';
import s from '../etablissements/etablissements.module.css';

const tc = textesEcrans.resto.compte;

/** Mon compte : adresse e-mail (confirmée par lien) et mot de passe. */
export default function Compte() {
  const [courant, setCourant] = useState<{ email: string | null; enAttente: string | null } | null>(null);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [envoi, setEnvoi] = useState<'email' | 'mdp' | null>(null);
  const [message, setMessage] = useState<{ zone: 'email' | 'mdp'; texte: string; ok: boolean } | null>(null);

  useEffect(() => {
    void emailDuCompte().then((c) => {
      setCourant(c);
      setEmail(c.enAttente ?? c.email ?? '');
    });
  }, []);

  async function enregistrerEmail(e: FormEvent) {
    e.preventDefault();
    if (!emailValide(email)) return setMessage({ zone: 'email', texte: tc.erreurEmail, ok: false });
    setEnvoi('email');
    setMessage(null);
    try {
      const adresse = normaliserEmail(email);
      const r = await changerEmail(adresse);
      if (r === 'pris') setMessage({ zone: 'email', texte: tc.emailPris, ok: false });
      else {
        setCourant((c) => ({ email: c?.email ?? null, enAttente: adresse }));
        setMessage({ zone: 'email', texte: tc.emailEnAttente(adresse), ok: true });
      }
    } catch {
      setMessage({ zone: 'email', texte: tc.erreur, ok: false });
    }
    setEnvoi(null);
  }

  async function enregistrerMotDePasse(e: FormEvent) {
    e.preventDefault();
    if ([...motDePasse].length < MOT_DE_PASSE_MIN) return setMessage({ zone: 'mdp', texte: textesEcrans.resto.inscription.erreurMotDePasse, ok: false });
    setEnvoi('mdp');
    setMessage(null);
    try {
      await changerMotDePasse(motDePasse);
      setMotDePasse('');
      setMessage({ zone: 'mdp', texte: tc.motDePasseChange, ok: true });
    } catch {
      setMessage({ zone: 'mdp', texte: tc.erreur, ok: false });
    }
    setEnvoi(null);
  }

  const retour = (zone: 'email' | 'mdp') =>
    message?.zone === zone && (
      <p className={message.ok ? `${ui.corpsFort} ${ui.vacoa}` : ui.messageErreur} role={message.ok ? 'status' : 'alert'}>
        {message.texte}
      </p>
    );

  return (
    <div className={p.etroite}>
      <div className={p.intro}>
        <h1 className={ui.titre}>{tc.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{tc.sousTitre}</p>
      </div>

      <form onSubmit={enregistrerEmail} className={`${s.carte} ${s.formulaire}`} noValidate>
        <div className={s.bloc}>
          <label htmlFor="compte-email" className={`${p.ligne} ${ui.corpsFort}`}>
            <Mail size={18} strokeWidth={2} aria-hidden />
            {tc.email}
          </label>
          {courant?.email && !courant.enAttente && (
            <span className={`${p.ligne} ${ui.legendeForte} ${ui.vacoa}`}>
              <Check size={16} strokeWidth={2.5} aria-hidden />
              {tc.emailConfirme}
            </span>
          )}
          <span className={ui.champ}>
            <input id="compte-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={envoi === 'email'} />
          </span>
          <p className={ui.legende}>{courant?.enAttente && message?.zone !== 'email' ? tc.emailEnAttente(courant.enAttente) : tc.emailAide}</p>
        </div>
        {retour('email')}
        <button type="submit" className={`${ui.boutonSecondaire} ${s.ajouter}`} aria-busy={envoi === 'email'} disabled={envoi === 'email'}>
          {envoi === 'email' && <Spinner />}
          {tc.enregistrer}
        </button>
      </form>

      <form onSubmit={enregistrerMotDePasse} className={`${s.carte} ${s.formulaire}`} noValidate>
        <div className={s.bloc}>
          <label htmlFor="compte-mdp" className={ui.corpsFort}>
            {tc.motDePasse}
          </label>
          <span className={ui.champ}>
            <input id="compte-mdp" type="password" autoComplete="new-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} disabled={envoi === 'mdp'} />
          </span>
          <p className={ui.legende}>{tc.motDePasseAide}</p>
        </div>
        {retour('mdp')}
        <button type="submit" className={`${ui.boutonSecondaire} ${s.ajouter}`} aria-busy={envoi === 'mdp'} disabled={envoi === 'mdp'}>
          {envoi === 'mdp' && <Spinner />}
          {tc.changerMotDePasse}
        </button>
      </form>
    </div>
  );
}
