'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { modeleBienvenueExtras, textesMessages as tm, type PublicMessage } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source, type DestinataireMessage, type MessageAdmin } from '@/lib/donnees';
import s from './admin.module.css';

const date = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Indian/Reunion',
    dateStyle: 'short',
    timeStyle: 'short',
  });

/** E-mail écrit à la main aux extras ou aux établissements, envoyé par le serveur dans la minute. */
export function Messages() {
  const [pub, setPub] = useState<PublicMessage>('extras');
  const [liste, setListe] = useState<DestinataireMessage[] | 'chargement'>('chargement');
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [sujet, setSujet] = useState<string>(modeleBienvenueExtras.sujet);
  const [message, setMessage] = useState<string>(modeleBienvenueExtras.message);
  const [envoi, setEnvoi] = useState<{ enCours: boolean; texte: string | null; erreur: boolean }>({
    enCours: false,
    texte: null,
    erreur: false,
  });
  const [historique, setHistorique] = useState<MessageAdmin[]>([]);

  const chargerHistorique = useCallback(() => {
    void source()
      .admin.messages()
      .then(setHistorique)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setListe('chargement');
    source()
      .admin.destinataires(pub)
      .then((l) => {
        setListe(l);
        setCoches(new Set(l.filter((d) => d.email).map((d) => d.id)));
      })
      .catch(() => setListe([]));
  }, [pub]);
  useEffect(chargerHistorique, [chargerHistorique]);

  const avecAdresse = useMemo(
    () => (Array.isArray(liste) ? liste.filter((d) => d.email) : []),
    [liste],
  );
  const choisis = avecAdresse.filter((d) => coches.has(d.id));

  function basculer(id: string) {
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!choisis.length || !window.confirm(tm.confirmer(choisis.length))) return;
    setEnvoi({ enCours: true, texte: null, erreur: false });
    try {
      const n = await source().admin.envoyerMessage(
        pub,
        sujet.trim(),
        message.trim(),
        choisis.map((d) => d.id),
      );
      setEnvoi({ enCours: false, texte: tm.programme(n), erreur: false });
      chargerHistorique();
    } catch {
      setEnvoi({ enCours: false, texte: tm.erreur, erreur: true });
    }
  }

  return (
    <>
      <p className={`${ui.corps} ${ui.galet}`}>{tm.intro}</p>
      <div className={s.periodes} role="radiogroup" aria-label={tm.destinataires}>
        {(['extras', 'etablissements'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={pub === k}
            className={s.periode}
            onClick={() => setPub(k)}
          >
            {tm.publics[k]}
          </button>
        ))}
      </div>

      <form onSubmit={envoyer} className={`${s.carte} ${s.campagne}`} aria-labelledby="ecrire">
        <h2 id="ecrire" className={`${p.ligne} ${ui.sousTitre}`}>
          <Send size={20} strokeWidth={2} aria-hidden />
          {tm.destinataires} · {choisis.length}
        </h2>
        {liste === 'chargement' ? (
          <div className={p.squelette} aria-busy />
        ) : (
          <>
            <div className={p.ligne}>
              <button
                type="button"
                className={ui.lien}
                onClick={() => setCoches(new Set(avecAdresse.map((d) => d.id)))}
              >
                {tm.toutCocher}
              </button>
              <button type="button" className={ui.lien} onClick={() => setCoches(new Set())}>
                {tm.toutDecocher}
              </button>
            </div>
            <ul className={s.destinataires}>
              {liste.map((d) => (
                <li key={d.id}>
                  <label className={s.destinataire} data-sans-adresse={!d.email}>
                    <input
                      type="checkbox"
                      checked={!!d.email && coches.has(d.id)}
                      disabled={!d.email}
                      onChange={() => basculer(d.id)}
                    />
                    <span>
                      <span className={ui.corpsFort}>{d.nom}</span>
                      <span className={s.sousLigne}>
                        {[d.detail, d.email ?? tm.sansAdresse].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <label className={s.bloc}>
          <span className={ui.corpsFort}>{tm.sujet}</span>
          <span className={ui.champ}>
            <input value={sujet} maxLength={150} onChange={(e) => setSujet(e.target.value)} />
          </span>
        </label>
        <label className={s.bloc}>
          <span className={ui.corpsFort}>{tm.message}</span>
          <textarea
            className={s.zoneTexte}
            value={message}
            maxLength={5000}
            rows={14}
            onChange={(e) => setMessage(e.target.value)}
          />
          <span className={`${ui.legende} ${ui.galet}`}>{tm.aidePrenom}</span>
        </label>
        <button
          type="button"
          className={ui.lien}
          onClick={() => {
            setSujet(modeleBienvenueExtras.sujet);
            setMessage(modeleBienvenueExtras.message);
          }}
        >
          {tm.modele}
        </button>
        <button
          type="submit"
          className={ui.boutonPrincipal}
          disabled={
            envoi.enCours ||
            choisis.length === 0 ||
            sujet.trim().length < 3 ||
            message.trim().length < 20
          }
        >
          {envoi.enCours && <Spinner />}
          {tm.envoyer(choisis.length)}
        </button>
        {envoi.texte && (
          <p className={envoi.erreur ? ui.messageErreur : ui.corps} role="status">
            {envoi.texte}
          </p>
        )}
      </form>

      <section className={p.section} aria-labelledby="historique">
        <h2 id="historique" className={ui.sousTitre}>
          {tm.historique}
        </h2>
        {historique.length === 0 ? (
          <p className={`${ui.legende} ${ui.galet}`}>{tm.aucunMessage}</p>
        ) : (
          <ul className={p.liste}>
            {historique.map((m) => (
              <li key={m.id} className={`${s.carte} ${s.campagneLigne}`}>
                <span className={ui.corpsFort}>{m.sujet}</span>
                <span className={`${ui.legende} ${ui.galet}`}>
                  {tm.publics[m.public]} · {date(m.creeLe)} · {tm.avancement(m.envoyes, m.total)}
                  {m.enAttente > 0 && ` · ${tm.attente(m.enAttente)}`}
                  {m.echecs > 0 && ` · ${tm.echecs(m.echecs)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
