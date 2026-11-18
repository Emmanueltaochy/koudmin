'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FileCheck2, Receipt } from 'lucide-react';
import { LIBELLES_STATUT_DPAE, lireCoefficient, textesDpae, textesFormules } from '@kivien/core';
import { Spinner } from '@/components/Spinner';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { source, type DpaeAdmin, type ReglagesDpaeAdmin } from '@/lib/donnees';
import s from './admin.module.css';

const ta = textesDpae.admin;
const tf = textesFormules.admin;
const jourCourt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** DPAE automatique : fermée par défaut ; l'admin l'ouvre quand le compte Urssaf est branché. */
function ReglageDpae() {
  const [d, setD] = useState<{ reglages: ReglagesDpaeAdmin; liste: DpaeAdmin[] } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);

  const charger = () =>
    source()
      .admin.dpae()
      .then(setD)
      .catch(() => undefined);
  useEffect(() => {
    void charger();
  }, []);
  if (!d) return null;
  const r = d.reglages;

  async function basculer(actif: boolean) {
    setEnvoi(true);
    setErreur(false);
    try {
      await source().admin.reglerDpae(actif);
      await charger();
    } catch {
      setErreur(true);
    }
    setEnvoi(false);
  }

  return (
    <section className={`${s.carte} ${s.campagne}`} aria-labelledby="reglage-dpae">
      <h2 id="reglage-dpae" className={`${p.ligne} ${ui.sousTitre}`}>
        <FileCheck2 size={20} strokeWidth={2} aria-hidden />
        {ta.titre}
      </h2>
      <p className={`${ui.legende} ${ui.galet}`}>{ta.aide}</p>
      <label className={s.caseLigne}>
        <input
          type="checkbox"
          checked={r.actif}
          disabled={envoi}
          onChange={(e) => void basculer(e.target.checked)}
        />
        <span className={ui.corpsFort}>{ta.ouvrir}</span>
      </label>
      <p
        className={r.actif ? `${ui.legendeForte} ${ui.vacoa}` : `${ui.legende} ${ui.galet}`}
        role="status"
      >
        {r.actif ? ta.ouverte : ta.fermee}
      </p>
      {erreur && (
        <p className={ui.messageErreur} role="alert">
          {ta.erreur}
        </p>
      )}
      <p className={ui.corps}>
        {ta.compteurs(r.mandats, r.aEnvoyer + r.envoyees, r.acceptees, r.aReprendre)}
      </p>

      <h3 className={ui.corpsFort}>{ta.dernieres}</h3>
      {d.liste.length === 0 ? (
        <p className={`${ui.legende} ${ui.galet}`}>{ta.aucune}</p>
      ) : (
        <div className={s.defilement}>
          <table className={s.tableau}>
            <tbody>
              {d.liste.map((l) => (
                <tr key={l.affectationId}>
                  <th scope="row">
                    {l.extra}
                    <span className={s.sousLigne}>{l.restaurant}</span>
                  </th>
                  <td>{jourCourt(l.jour)}</td>
                  <td>
                    {LIBELLES_STATUT_DPAE[l.statut]}
                    {(l.reference || l.motif) && (
                      <span className={s.sousLigne}>{l.reference ?? l.motif}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Formule tout compris : préparée, fermée par défaut. */
function ReglageFormules() {
  const [actif, setActif] = useState<boolean | null>(null);
  const [coefficient, setCoefficient] = useState('');
  const [demandes, setDemandes] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  useEffect(() => {
    void source()
      .admin.formules()
      .then((f) => {
        setActif(f.toutCompris);
        setCoefficient(
          (f.coefficientMilliemes / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 3 }),
        );
        setDemandes(f.demandesToutCompris);
      })
      .catch(() => undefined);
  }, []);
  if (actif === null) return null;

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const milliemes = lireCoefficient(coefficient);
    if (milliemes === null) return setMessage({ texte: tf.erreur, erreur: true });
    setEnvoi(true);
    setMessage(null);
    try {
      await source().admin.reglerFormules(!!actif, milliemes);
      setMessage({ texte: tf.enregistre, erreur: false });
    } catch {
      setMessage({ texte: tf.erreur, erreur: true });
    }
    setEnvoi(false);
  }

  return (
    <form
      onSubmit={enregistrer}
      className={`${s.carte} ${s.campagne}`}
      aria-labelledby="reglage-formules"
    >
      <h2 id="reglage-formules" className={`${p.ligne} ${ui.sousTitre}`}>
        <Receipt size={20} strokeWidth={2} aria-hidden />
        {tf.titre}
      </h2>
      <p className={`${ui.legende} ${ui.galet}`}>{tf.aide}</p>
      <label className={s.caseLigne}>
        <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
        <span className={ui.corpsFort}>{tf.ouvrir}</span>
      </label>
      <p className={actif ? `${ui.legendeForte} ${ui.vacoa}` : `${ui.legende} ${ui.galet}`}>
        {actif ? tf.ouverte : tf.fermee}
      </p>
      <label className={s.bloc}>
        <span className={ui.corpsFort}>{tf.coefficient}</span>
        <span className={`${ui.champ} ${s.champCourt}`}>
          <input
            value={coefficient}
            inputMode="decimal"
            maxLength={5}
            onChange={(e) => setCoefficient(e.target.value)}
          />
        </span>
        <span className={`${ui.legende} ${ui.galet}`}>{tf.coefficientAide}</span>
      </label>
      {demandes > 0 && <p className={ui.corps}>{tf.demandes(demandes)}</p>}
      {message && (
        <p
          className={message.erreur ? ui.messageErreur : `${ui.corpsFort} ${ui.vacoa}`}
          role={message.erreur ? 'alert' : 'status'}
        >
          {message.texte}
        </p>
      )}
      <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
        {envoi && <Spinner />}
        {tf.enregistrer}
      </button>
    </form>
  );
}

/** Réglages de la plateforme, fermés par défaut. */
export function Reglages() {
  return (
    <>
      <ReglageDpae />
      <ReglageFormules />
    </>
  );
}
