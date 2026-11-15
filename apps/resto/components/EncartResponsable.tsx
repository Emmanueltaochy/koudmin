'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { textesEcrans } from '@kivien/core';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source } from '@/lib/donnees';
import s from './EncartResponsable.module.css';

const tr = textesEcrans.resto.responsable;
const ti = textesEcrans.resto.inscription;

/** Comptes ouverts avant la question : prénom et nom demandés une fois, en haut de l'espace. */
export function EncartResponsable() {
  const [visible, setVisible] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    source()
      .responsable()
      .then((r) => setVisible(!r))
      .catch(() => undefined);
  }, []);
  if (!visible) return null;

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (!prenom.trim()) return setErreur(ti.erreurPrenom);
    if (!nom.trim()) return setErreur(ti.erreurNom);
    setEnvoi(true);
    setErreur(null);
    try {
      await source().noterResponsable(prenom, nom);
      setVisible(false);
    } catch {
      setErreur(tr.erreur);
    }
    setEnvoi(false);
  }

  return (
    <form
      className={s.encart}
      onSubmit={enregistrer}
      aria-labelledby="encart-responsable"
      noValidate
    >
      <div>
        <h2 id="encart-responsable" className={ui.corpsFort}>
          {tr.titre}
        </h2>
        <p className={ui.legende}>{tr.texte}</p>
      </div>
      <div className={s.champs}>
        <label className={s.champ}>
          <span className={ui.legende}>{ti.prenom}</span>
          <span className={ui.champ}>
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoComplete="given-name"
              maxLength={60}
              disabled={envoi}
            />
          </span>
        </label>
        <label className={s.champ}>
          <span className={ui.legende}>{ti.nom}</span>
          <span className={ui.champ}>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoComplete="family-name"
              maxLength={60}
              disabled={envoi}
            />
          </span>
        </label>
      </div>
      {erreur && (
        <p className={ui.messageErreur} role="alert">
          {erreur}
        </p>
      )}
      <button type="submit" className={ui.boutonSecondaire} disabled={envoi}>
        {envoi && <Spinner />}
        {tr.bouton}
      </button>
    </form>
  );
}
