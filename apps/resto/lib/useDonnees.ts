'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ecouterEtablissement, ErreurReseau, source, type SourceResto } from './donnees';

export type Etat<T> =
  | { statut: 'chargement' }
  | { statut: 'erreur'; reseau: boolean }
  | { statut: 'pret'; donnees: T };

/**
 * Charge une donnée et la tient à jour : rechargement silencieux à chaque changement
 * signalé par le temps réel (nouvelle affectation, signature, annulation).
 */
export function useDonnees<T>(charger: (s: SourceResto) => Promise<T>, cles: unknown[] = []) {
  const [etat, setEtat] = useState<Etat<T>>({ statut: 'chargement' });
  const chargerRef = useRef(charger);
  chargerRef.current = charger;

  const recharger = useCallback(async (silencieux = false) => {
    if (!silencieux) setEtat({ statut: 'chargement' });
    try {
      setEtat({ statut: 'pret', donnees: await chargerRef.current(source()) });
    } catch (e) {
      const reseau = e instanceof ErreurReseau || e instanceof TypeError;
      if (!reseau) console.error(e);
      if (!silencieux) setEtat({ statut: 'erreur', reseau });
    }
  }, []);

  useEffect(() => {
    void recharger();
    const arreter = source().ecouter(() => void recharger(true));
    // Autre établissement choisi : rechargement complet.
    const arreterChoix = ecouterEtablissement(() => void recharger());
    return () => {
      arreter();
      arreterChoix();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, cles);

  return { etat, recharger };
}
