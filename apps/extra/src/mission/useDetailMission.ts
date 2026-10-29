import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  etatDepuisServeur,
  transitionMission,
  type EtatMission,
  type EvenementMission,
  type MissionResume,
} from '@koudmin/core';
import { ErreurReseau, source, type MissionDetail } from '../donnees';
import { cacheMissions } from '../donnees/cache';

/** États forcés pour la démo et les captures : `/mission/d001?demo=…`. */
export type DemoDetail = 'envoi' | 'confirmee' | 'prise' | 'desistement';

type Action = EvenementMission | { type: 'SERVEUR'; confirmee: boolean; disponible: boolean };

function reducteur(etat: EtatMission, action: Action): EtatMission {
  if (action.type === 'SERVEUR') return etatDepuisServeur(action);
  return transitionMission(etat, action);
}

const estErreurReseau = (e: unknown) => e instanceof ErreurReseau || e instanceof TypeError;

async function enLigne(): Promise<boolean> {
  return (await NetInfo.fetch()).isConnected !== false;
}

export type Chargement = 'pret' | 'chargement' | 'horsLigne' | 'introuvable';

export function useDetailMission(id: string, demo?: DemoDetail) {
  // Affichage immédiat à partir de la carte touchée ; le serveur complète ensuite.
  const [resume] = useState<MissionResume | null>(() => cacheMissions.get(id) ?? null);
  const [detail, setDetail] = useState<MissionDetail | null>(null);
  const [chargement, setChargement] = useState<Chargement>(resume ? 'pret' : 'chargement');
  const [etat, envoyer] = useReducer(reducteur, { nom: 'idle' });
  const [missionsRestantes, setMissionsRestantes] = useState(0);
  const [expiree, setExpiree] = useState(false);

  // L'état courant, lu dans les rappels asynchrones (évite un double envoi).
  const etatCourant = useRef(etat);
  etatCourant.current = etat;

  const chargerDetail = useCallback(async () => {
    if (!resume) setChargement('chargement');
    try {
      if (!(await enLigne())) throw new ErreurReseau('hors ligne');
      const d = await source.detail(id);
      if (!d) {
        setChargement('introuvable');
        return;
      }
      setDetail(d);
      setChargement('pret');
      // Ne pas écraser une action en cours (ex. « Mi lé la » appuyé pendant le chargement).
      if (etatCourant.current.nom === 'idle') {
        envoyer({ type: 'SERVEUR', confirmee: d.confirmee, disponible: d.disponible });
      }
    } catch (e) {
      if (!estErreurReseau(e)) console.error(e);
      if (!resume) setChargement('horsLigne');
    }
  }, [id, resume]);

  const compterRestantes = useCallback(async (jour: string) => {
    try {
      const toutes = await source.missions();
      setMissionsRestantes(toutes.filter((m) => m.id !== id && m.jour === jour).length);
    } catch {
      setMissionsRestantes(0);
    }
  }, [id]);

  useEffect(() => {
    if (demo) {
      void jouerDemo(demo);
      return;
    }
    void chargerDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, id]);

  /** Démo (données fictives uniquement) : amène l'écran dans l'état demandé. */
  async function jouerDemo(d: DemoDetail) {
    if (d === 'confirmee' || d === 'desistement') await source.accepter(id);
    const m = await source.detail(id);
    if (!m) return setChargement('introuvable');
    setDetail(m);
    setChargement('pret');
    envoyer({ type: 'SERVEUR', confirmee: m.confirmee, disponible: m.disponible });
    if (d === 'desistement') envoyer({ type: 'DESISTER' });
    if (d === 'envoi' || d === 'prise') envoyer({ type: 'ACCEPTER' });
    if (d === 'prise') {
      await compterRestantes(m.jour);
      envoyer({ type: 'DEJA_PRISE' });
    }
  }

  /** « Mi lé la » */
  const accepter = useCallback(async () => {
    if (etatCourant.current.nom !== 'idle') return;
    envoyer({ type: 'ACCEPTER' });
    try {
      if (!(await enLigne())) throw new ErreurReseau('hors ligne');
      const reponse = await source.accepter(id);
      if (reponse === 'confirmee') {
        envoyer({ type: 'CONFIRMEE' });
        // L'adresse exacte n'est envoyée qu'après confirmation.
        const d = await source.detail(id).catch(() => null);
        if (d) setDetail(d);
      } else if (reponse === 'deja_prise') {
        const jour = detail?.jour ?? resume?.jour;
        if (jour) await compterRestantes(jour);
        envoyer({ type: 'DEJA_PRISE' });
      } else {
        // Mission commencée entre-temps : elle n'est plus proposée.
        setExpiree(true);
      }
    } catch (e) {
      if (!estErreurReseau(e)) console.error(e);
      envoyer({ type: 'ECHEC_RESEAU' });
    }
  }, [compterRestantes, detail, id, resume]);

  const desister = useCallback(() => envoyer({ type: 'DESISTER' }), []);
  const annulerDesistement = useCallback(() => envoyer({ type: 'ANNULER' }), []);

  const confirmerDesistement = useCallback(async () => {
    if (etatCourant.current.nom !== 'cancel') return;
    envoyer({ type: 'CONFIRMER_DESISTEMENT' });
    try {
      if (!(await enLigne())) throw new ErreurReseau('hors ligne');
      await source.seDesister(id);
      envoyer({ type: 'LIBEREE' });
    } catch (e) {
      if (!estErreurReseau(e)) console.error(e);
      envoyer({ type: 'ECHEC_RESEAU' });
    }
  }, [id]);

  return {
    mission: detail ?? resume,
    detail,
    chargement,
    etat,
    missionsRestantes,
    expiree,
    recharger: chargerDetail,
    accepter,
    desister,
    annulerDesistement,
    confirmerDesistement,
  };
}
