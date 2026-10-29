import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import type { MissionResume } from '@koudmin/core';
import { ErreurReseau, source, type MissionConfirmee, type Profil } from '../donnees';
import { memoriserMissions } from '../donnees/cache';

export type EtatListe =
  | { statut: 'chargement' }
  | { statut: 'horsLigne' }
  | { statut: 'pret'; missions: MissionResume[] };

/** États forcés pour la démo et les captures : `/?demo=chargement|vide|horsLigne`. */
export type Demo = 'chargement' | 'vide' | 'horsLigne';

export function useMissions(demo?: Demo) {
  const [etat, setEtat] = useState<EtatListe>({ statut: 'chargement' });
  const [profil, setProfil] = useState<Profil | null>(null);
  const [confirmees, setConfirmees] = useState<MissionConfirmee[]>([]);
  const etatCourant = useRef(etat);
  etatCourant.current = etat;

  const charger = useCallback(
    async (silencieux = false) => {
      if (demo) {
        setEtat(
          demo === 'vide' ? { statut: 'pret', missions: [] } : { statut: demo },
        );
        if (!profil) setProfil(await source.profil());
        return;
      }
      if (!silencieux) setEtat({ statut: 'chargement' });
      const reseau = await NetInfo.fetch();
      if (reseau.isConnected === false) {
        setEtat({ statut: 'horsLigne' });
        return;
      }
      try {
        const [p, missions, miennes] = await Promise.all([source.profil(), source.missions(), source.mesMissions()]);
        memoriserMissions(missions);
        memoriserMissions(miennes);
        setProfil(p);
        setConfirmees(miennes);
        setEtat({ statut: 'pret', missions });
      } catch (e) {
        if (!(e instanceof ErreurReseau || e instanceof TypeError)) console.error(e);
        // Erreur serveur non dessinée : on affiche l'écran hors ligne, qui propose de réessayer.
        if (!silencieux) setEtat({ statut: 'horsLigne' });
      }
    },
    [demo, profil],
  );

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // « Les missions s'afficheront dès que la connexion revient. »
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        if (s.isConnected && etatCourant.current.statut === 'horsLigne' && !demo) void charger();
      }),
    [charger, demo],
  );

  // Temps réel : une mission publiée, prise ou libérée recharge la liste sans squelette.
  useEffect(() => (demo ? undefined : source.ecouterMissions(() => void charger(true))), [charger, demo]);

  // Retour sur l'écran (après « Mi lé la » ou un désistement) : liste à jour, sans squelette.
  const premierFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (premierFocus.current) {
        premierFocus.current = false;
        return;
      }
      if (!demo) void charger(true);
    }, [charger, demo]),
  );

  return { etat, profil, confirmees, recharger: () => charger() };
}
