'use client';

import { useState, type FormEvent } from 'react';
import { Clock, UserRound } from 'lucide-react';
import { formatMobileReunion, normaliserMobileReunion, textes as t, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source, type Membre, type Role } from '@/lib/donnees';
import { useDonnees } from '@/lib/useDonnees';
import s from '../etablissements/etablissements.module.css';

const tu = textesEcrans.resto.utilisateurs;
const tr = textesEcrans.resto.roles;

function ChoixRole({ id, valeur, onChange, desactive }: { id: string; valeur: Role; onChange: (r: Role) => void; desactive?: boolean }) {
  return (
    <span className={ui.champ}>
      <select id={id} value={valeur} disabled={desactive} onChange={(e) => onChange(e.target.value as Role)}>
        <option value="equipe">{tr.equipe}</option>
        <option value="gerant">{tr.gerant}</option>
      </select>
    </span>
  );
}

/** Personnes ayant accès à l'établissement affiché ; un accès complet invite, change les rôles, retire. */
export default function Utilisateurs() {
  const { etat, recharger } = useDonnees(async (src) => {
    const restaurant = await src.restaurant();
    return { restaurant, membres: await src.equipe(restaurant.id) };
  });
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<Role>('equipe');
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (etat.statut !== 'pret') {
    return (
      <div className={p.page} aria-busy={etat.statut === 'chargement'}>
        {etat.statut === 'erreur' ? <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p> : <div className={p.squelette} />}
      </div>
    );
  }
  const { restaurant, membres } = etat.donnees;
  const gerant = restaurant.role === 'gerant';

  async function agir(action: () => Promise<'ok' | 'dernierGerant' | void>) {
    setErreur(null);
    setMessage(null);
    try {
      const r = await action();
      if (r === 'dernierGerant') setErreur(tu.dernierGerant);
      await recharger(true);
    } catch {
      setErreur(tu.erreur);
    }
  }

  async function inviter(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    const e164 = normaliserMobileReunion(mobile);
    if (!e164) return setErreur(textesEcrans.connexion.erreurTelephone);
    setEnvoi(true);
    try {
      const r = await source().inviter(restaurant.id, e164, role);
      if (r === 'ok') {
        setMobile('');
        setMessage(tu.invitationEnregistree);
        await recharger(true);
      } else {
        setErreur(r === 'dejaMembre' ? tu.dejaMembre : r === 'compteExtra' ? tu.compteExtra : tu.reserveGerant);
      }
    } catch {
      setErreur(tu.erreur);
    }
    setEnvoi(false);
  }

  const ligne = (m: Membre) => (
    <li key={m.utilisateurId ?? m.telephone} className={s.carte}>
      <div className={p.entreDeux}>
        <span className={`${p.ligne} ${ui.corpsFort}`}>
          {m.enAttente ? <Clock size={20} strokeWidth={2} aria-hidden /> : <UserRound size={20} strokeWidth={2} aria-hidden />}
          {formatMobileReunion(m.telephone)}
          {m.moi && <span className={ui.legende}>· {tu.vous}</span>}
        </span>
        {(!gerant || m.enAttente) && <span className={s.badge}>{tr[m.role]}</span>}
      </div>
      {m.enAttente && <span className={ui.legende}>{tu.enAttente}</span>}
      {gerant && (
        <div className={s.actions}>
          {!m.enAttente && m.utilisateurId && (
            <>
              <label htmlFor={`role-${m.utilisateurId}`} className="sr-only">
                {tu.acces}
              </label>
              <ChoixRole
                id={`role-${m.utilisateurId}`}
                valeur={m.role}
                onChange={(r) => void agir(() => source().changerRole(restaurant.id, m.utilisateurId!, r))}
              />
              {!m.moi && (
                <button type="button" className={ui.lienDiscret} onClick={() => void agir(() => source().retirerMembre(restaurant.id, m.utilisateurId!))}>
                  {tu.retirer}
                </button>
              )}
            </>
          )}
          {m.enAttente && (
            <button type="button" className={ui.lienDiscret} onClick={() => void agir(() => source().annulerInvitation(restaurant.id, m.telephone))}>
              {tu.annulerInvitation}
            </button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className={p.page}>
      <div className={p.intro}>
        <h1 className={ui.titre}>{tu.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>
          {restaurant.nom}. {tu.sousTitre}
        </p>
      </div>

      {erreur && (
        <p className={ui.messageErreur} role="alert">
          {erreur}
        </p>
      )}
      {message && (
        <p className={`${ui.corpsFort} ${ui.vacoa}`} role="status">
          {message}
        </p>
      )}

      <ul className={`${p.liste} ${p.grilleCartes}`}>{membres.map(ligne)}</ul>

      {gerant ? (
        <section className={s.carte} aria-labelledby="titre-invitation">
          <h2 id="titre-invitation" className={ui.sousTitre}>
            {tu.inviterTitre}
          </h2>
          <form onSubmit={inviter} className={s.formulaire} noValidate>
            <div className={s.bloc}>
              <label htmlFor="invitation-mobile" className={ui.corpsFort}>
                {tu.mobile}
              </label>
              <span className={ui.champ}>
                <input
                  id="invitation-mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="0692 12 34 56"
                  value={mobile}
                  disabled={envoi}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </span>
            </div>
            <div className={s.bloc}>
              <label htmlFor="invitation-role" className={ui.corpsFort}>
                {tu.acces}
              </label>
              <ChoixRole id="invitation-role" valeur={role} onChange={setRole} desactive={envoi} />
              <p className={ui.legende}>{tr.aide}</p>
            </div>
            <button type="submit" className={`${ui.boutonPrincipal} ${s.ajouter}`} aria-busy={envoi} disabled={envoi}>
              {envoi && <Spinner />}
              {tu.inviter}
            </button>
          </form>
        </section>
      ) : (
        <p className={p.vide}>{tu.reserveGerant}</p>
      )}
    </div>
  );
}
