'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard, Landmark, RotateCcw } from 'lucide-react';
import { formatEuros, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source, type ModePaiement, type MoyenPaiement, type PaiementFrais, type Restaurant } from '@/lib/donnees';
import s from './paiement.module.css';

const tp = textesEcrans.resto.paiement;
const MODES: ModePaiement[] = ['carte_mission', 'sepa_mission', 'mensuel_carte', 'mensuel_sepa'];
/** « Kivien · mise en relation du … » → « Mise en relation du … ». */
const libelle = (l: string) => {
  const t = l.replace(/^Kivien · /, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Indian/Reunion' });

interface Etat {
  restaurant: Restaurant;
  fraisHT: number;
  moyen: MoyenPaiement;
  historique: PaiementFrais[];
  aRegler: { misesEnRelation: number; ttcCentimes: number };
}

/**
 * Paiement des frais Kivien (gérant) : mode, carte (page Stripe), prélèvement SEPA (page GoCardless)
 * et paiements passés. Au retour de Stripe ou de GoCardless, l'enregistrement est confirmé ici.
 */
export default function Paiement() {
  const [etat, setEtat] = useState<Etat | 'chargement' | 'reserve' | 'erreur'>('chargement');
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);

  const charger = useCallback(async () => {
    const src = source();
    const restaurant = await src.restaurant();
    if (restaurant.role !== 'gerant') return setEtat('reserve');
    const [parametres, moyen, historique, aRegler] = await Promise.all([
      src.parametres(),
      src.paiement.moyen(restaurant.id),
      src.paiement.historique(restaurant.id),
      src.paiement.aRegler(restaurant.id),
    ]);
    setEtat({ restaurant, fraisHT: parametres.fraisMiseEnRelationHTCentimes, moyen, historique, aRegler });
  }, []);

  // Retour de Stripe (?retour=carte&session=…) ou de GoCardless (?retour=sepa) : confirmation.
  useEffect(() => {
    void (async () => {
      try {
        const q = new URLSearchParams(window.location.search);
        const retour = q.get('retour');
        if (retour === 'carte' || retour === 'sepa') {
          const restaurant = await source().restaurant();
          const action = retour === 'carte' ? { action: 'carte-confirmer' as const, session: q.get('session') ?? '' } : { action: 'sepa-confirmer' as const };
          let r = await source().paiement.agir(restaurant.id, action);
          // La banque peut mettre quelques secondes à confirmer.
          for (let i = 0; i < 4 && r.statut === 'attente'; i++) {
            await new Promise((ok) => setTimeout(ok, 2000));
            r = await source().paiement.agir(restaurant.id, action);
          }
          setMessage(
            r.statut === 'ok'
              ? { texte: retour === 'carte' ? tp.carteEnregistree : tp.sepaEnregistre, ok: true }
              : { texte: r.erreur ?? tp.attente, ok: r.statut === 'attente' },
          );
          window.history.replaceState(null, '', '/paiement');
        }
        await charger();
      } catch {
        setEtat('erreur');
      }
    })();
  }, [charger]);

  async function agir(cle: string, a: Parameters<ReturnType<typeof source>['paiement']['agir']>[1], succes?: string) {
    if (typeof etat !== 'object') return;
    setOccupe(cle);
    setMessage(null);
    try {
      const r = await source().paiement.agir(etat.restaurant.id, a);
      if (r.url) {
        window.location.assign(r.url);
        return;
      }
      if (r.erreur) setMessage({ texte: r.erreur, ok: false });
      else if (succes) setMessage({ texte: succes, ok: true });
      await charger();
    } catch {
      setMessage({ texte: tp.erreur, ok: false });
    }
    setOccupe(null);
  }

  if (etat === 'chargement') return <div className={p.page}><div className={p.squelette} aria-busy /></div>;
  if (etat === 'reserve') return <div className={p.etroite}><h1 className={ui.titre}>{tp.titre}</h1><p className={ui.corps}>{tp.reserve}</p></div>;
  if (etat === 'erreur') return <div className={p.etroite}><p className={`${ui.sousTitre} ${ui.braise}`}>{tp.erreur}</p></div>;

  const { moyen: m, historique, aRegler } = etat;
  const sansMoyen = !m.carte && !(m.sepa && m.mandatValide);

  return (
    <div className={p.etroite}>
      <div className={p.intro}>
        <h1 className={ui.titre}>{tp.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{tp.sousTitre(formatEuros(etat.fraisHT))}</p>
      </div>

      {message && (
        <p className={message.ok ? ui.bandeauVacoa : ui.messageErreur} role={message.ok ? 'status' : 'alert'}>
          {message.ok && <Check size={20} strokeWidth={2.5} aria-hidden />}
          {message.texte}
        </p>
      )}

      {aRegler.misesEnRelation > 0 && (
        <section className={`${s.carte} ${s.aRegler}`} aria-labelledby="a-regler">
          <h2 id="a-regler" className={ui.corpsFort}>{tp.aRegler}</h2>
          <p className={ui.corps}>{tp.aReglerTexte(aRegler.misesEnRelation, formatEuros(aRegler.ttcCentimes))}</p>
          {sansMoyen && <p className={ui.corpsFort}>{tp.aucunMoyen}</p>}
        </section>
      )}

      <section className={p.section} aria-labelledby="mode">
        <h2 id="mode" className={ui.sousTitre}>{tp.choisirMode}</h2>
        <div role="radiogroup" aria-labelledby="mode" className={s.modes}>
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={m.mode === mode}
              className={s.mode}
              disabled={!!occupe}
              onClick={() => m.mode !== mode && void agir(`mode-${mode}`, { action: 'mode', mode }, tp.modeEnregistre)}
            >
              <span className={s.coche} aria-hidden>{m.mode === mode && <Check size={16} strokeWidth={3} />}</span>
              <span className={s.modeTexte}>
                <span className={ui.corpsFort}>{tp.modes[mode].titre}</span>
                <span className={`${ui.legende} ${ui.galet}`}>{tp.modes[mode].texte}</span>
              </span>
              {occupe === `mode-${mode}` && <Spinner />}
            </button>
          ))}
        </div>
      </section>

      <section className={s.carte} aria-labelledby="carte">
        <h2 id="carte" className={`${p.ligne} ${ui.corpsFort}`}>
          <CreditCard size={20} strokeWidth={2} aria-hidden />
          {tp.carte}
        </h2>
        <p className={ui.corps}>{m.carte ?? tp.aucuneCarte}</p>
        <p className={`${ui.legende} ${ui.galet}`}>{tp.carteAide}</p>
        <button type="button" className={`${ui.boutonSecondaire} ${s.action}`} disabled={!!occupe} onClick={() => void agir('carte', { action: 'carte' })}>
          {occupe === 'carte' && <Spinner />}
          {m.carte ? tp.remplacerCarte : tp.ajouterCarte}
        </button>
      </section>

      <section className={s.carte} aria-labelledby="sepa">
        <h2 id="sepa" className={`${p.ligne} ${ui.corpsFort}`}>
          <Landmark size={20} strokeWidth={2} aria-hidden />
          {tp.sepa}
        </h2>
        <p className={ui.corps}>{m.sepa ?? (m.sepaEnAttente ? tp.attente : tp.aucunMandat)}</p>
        {m.sepa && !m.mandatValide && <p className={ui.messageErreur}>{tp.mandatInvalide}</p>}
        <p className={`${ui.legende} ${ui.galet}`}>{tp.sepaAide}</p>
        <button type="button" className={`${ui.boutonSecondaire} ${s.action}`} disabled={!!occupe} onClick={() => void agir('sepa', { action: 'sepa' })}>
          {occupe === 'sepa' && <Spinner />}
          {m.sepa ? tp.remplacerSepa : tp.ajouterSepa}
        </button>
      </section>

      <section className={p.section} aria-labelledby="historique">
        <h2 id="historique" className={ui.sousTitre}>{tp.historique}</h2>
        {historique.length === 0 ? (
          <p className={`${ui.corps} ${ui.galet}`}>{tp.aucunPaiement}</p>
        ) : (
          <ul className={p.liste}>
            {historique.map((x) => (
              <li key={x.id} className={s.ligne}>
                <div className={s.ligneTexte}>
                  <span className={ui.corps}>{libelle(x.libelle)}</span>
                  <span className={`${ui.legende} ${ui.galet}`}>
                    {date(x.creeLe)} · {x.moyen === 'sepa' ? tp.sepa : tp.carte}
                  </span>
                  {x.statut === 'echoue' && x.erreur && <span className={`${ui.legende} ${ui.braise}`}>{x.erreur}</span>}
                </div>
                <div className={s.ligneMontant}>
                  <span className={ui.corpsFort}>{formatEuros(x.montantTTCCentimes)}</span>
                  <span className={s.statut} data-statut={x.statut}>{tp.statuts[x.statut]}</span>
                  {x.statut === 'echoue' && (
                    <button type="button" className={ui.lien} disabled={!!occupe} onClick={() => void agir(`reessayer-${x.id}`, { action: 'reessayer', paiement: x.id })}>
                      {occupe === `reessayer-${x.id}` ? <Spinner /> : <RotateCcw size={16} strokeWidth={2} aria-hidden />}
                      {tp.reessayer}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
