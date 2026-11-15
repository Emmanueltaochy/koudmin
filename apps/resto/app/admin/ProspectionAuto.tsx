'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Repeat } from 'lucide-react';
import {
  formatEuros,
  LIBELLES_ZONE,
  modeleCampagne,
  modeleRelance,
  textesProspectionAuto as ta,
  ZONES,
  type Zone,
} from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source, type ReglagesProspectionAuto } from '@/lib/donnees';
import s from './admin.module.css';

type Reglages = Omit<ReglagesProspectionAuto, 'aLancer' | 'aRelancer'>;

/** Prospection automatique : désactivée par défaut, par zone, avec une relance. */
export function ProspectionAuto() {
  const [r, setR] = useState<Reglages | null>(null);
  const [apercu, setApercu] = useState<{ aLancer: number; aRelancer: number } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  async function charger() {
    const [reglages, parametres] = await Promise.all([
      source().admin.prospection.reglagesAuto(),
      source().parametres(),
    ]);
    const frais = formatEuros(parametres.fraisHoraireHTCentimes);
    const lancement = modeleCampagne(frais);
    const relance = modeleRelance(frais);
    setR({
      actif: reglages.actif,
      zones: reglages.zones,
      relance: reglages.relance,
      relanceJours: reglages.relanceJours,
      sujet: reglages.sujet ?? lancement.sujet,
      message: reglages.message ?? lancement.message,
      relanceSujet: reglages.relanceSujet ?? relance.sujet,
      relanceMessage: reglages.relanceMessage ?? relance.message,
    });
    setApercu({ aLancer: reglages.aLancer, aRelancer: reglages.aRelancer });
  }
  useEffect(() => {
    void charger().catch(() => undefined);
  }, []);
  if (!r) return null;

  const maj = (m: Partial<Reglages>) => setR({ ...r, ...m });
  const basculerZone = (z: Zone) =>
    maj({ zones: r.zones.includes(z) ? r.zones.filter((x) => x !== z) : [...r.zones, z] });

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (!r) return;
    if (!r.zones.length) return setMessage({ texte: ta.erreurZone, erreur: true });
    setEnvoi(true);
    setMessage(null);
    try {
      await source().admin.prospection.reglerAuto(r);
      setMessage({ texte: ta.enregistre, erreur: false });
      await charger();
    } catch {
      setMessage({ texte: ta.erreur, erreur: true });
    }
    setEnvoi(false);
  }

  return (
    <form
      onSubmit={enregistrer}
      className={`${s.carte} ${s.campagne}`}
      aria-labelledby="prospection-auto"
    >
      <h2 id="prospection-auto" className={`${p.ligne} ${ui.sousTitre}`}>
        <Repeat size={20} strokeWidth={2} aria-hidden />
        {ta.titre}
      </h2>
      <p className={`${ui.legende} ${ui.galet}`}>{ta.aide}</p>
      <label className={s.caseLigne}>
        <input
          type="checkbox"
          checked={r.actif}
          onChange={(e) => maj({ actif: e.target.checked })}
        />
        <span className={ui.corpsFort}>{ta.activer}</span>
      </label>
      <p className={r.actif ? `${ui.legendeForte} ${ui.vacoa}` : `${ui.legende} ${ui.galet}`}>
        {r.actif ? ta.activee : ta.desactivee}
      </p>

      <fieldset className={s.zonesAuto}>
        <legend className={ui.corpsFort}>{ta.zones}</legend>
        {ZONES.map((z) => (
          <label key={z} className={s.caseLigne}>
            <input type="checkbox" checked={r.zones.includes(z)} onChange={() => basculerZone(z)} />
            <span>{LIBELLES_ZONE[z]}</span>
          </label>
        ))}
        <span className={`${ui.legende} ${ui.galet}`}>{ta.zonesAide}</span>
      </fieldset>
      {apercu && <p className={ui.corps}>{ta.apercu(apercu.aLancer, apercu.aRelancer)}</p>}

      <h3 className={ui.corpsFort}>{ta.lancement}</h3>
      <label className={s.bloc}>
        <span className={ui.legende}>{ta.sujet}</span>
        <span className={ui.champ}>
          <input
            value={r.sujet ?? ''}
            maxLength={150}
            onChange={(e) => maj({ sujet: e.target.value })}
            aria-label={`${ta.lancement} : ${ta.sujet}`}
          />
        </span>
      </label>
      <label className={s.bloc}>
        <span className={ui.legende}>{ta.message}</span>
        <textarea
          className={s.zoneTexte}
          rows={10}
          maxLength={5000}
          value={r.message ?? ''}
          onChange={(e) => maj({ message: e.target.value })}
          aria-label={`${ta.lancement} : ${ta.message}`}
        />
      </label>

      <label className={s.caseLigne}>
        <input
          type="checkbox"
          checked={r.relance}
          onChange={(e) => maj({ relance: e.target.checked })}
        />
        <span className={ui.corpsFort}>{ta.relance}</span>
      </label>
      {r.relance && (
        <>
          <label className={s.bloc}>
            <span className={ui.legende}>{ta.relanceApres}</span>
            <span className={`${ui.champ} ${s.champCourt}`}>
              <input
                type="number"
                min={3}
                max={60}
                value={r.relanceJours}
                onChange={(e) =>
                  maj({ relanceJours: Math.min(60, Math.max(3, Number(e.target.value) || 10)) })
                }
              />
            </span>
          </label>
          <label className={s.bloc}>
            <span className={ui.legende}>{ta.sujet}</span>
            <span className={ui.champ}>
              <input
                value={r.relanceSujet ?? ''}
                maxLength={150}
                onChange={(e) => maj({ relanceSujet: e.target.value })}
                aria-label={`Relance : ${ta.sujet}`}
              />
            </span>
          </label>
          <label className={s.bloc}>
            <span className={ui.legende}>{ta.message}</span>
            <textarea
              className={s.zoneTexte}
              rows={8}
              maxLength={5000}
              value={r.relanceMessage ?? ''}
              onChange={(e) => maj({ relanceMessage: e.target.value })}
              aria-label={`Relance : ${ta.message}`}
            />
          </label>
        </>
      )}

      <button type="submit" className={ui.boutonSecondaire} disabled={envoi}>
        {envoi && <Spinner />}
        {ta.enregistrer}
      </button>
      {message && (
        <p className={message.erreur ? ui.messageErreur : ui.corps} role="status">
          {message.texte}
        </p>
      )}
    </form>
  );
}
