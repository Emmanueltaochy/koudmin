/**
 * Acceptation d'une mission côté extra.
 *
 *   idle → sending → done
 *               ↘ taken      (un autre extra a été plus rapide)
 *               ↘ idle       (échec réseau : on peut réessayer)
 *   idle | done → cancel → (Annuler) état précédent
 *                        → (Confirmer) liberee : mission libérée, restaurant notifié
 *
 * Toute transition non prévue est ignorée (ex. double appui pendant l'envoi).
 */
export type EtatMission =
  | { nom: 'idle'; erreurReseau?: boolean }
  | { nom: 'sending' }
  | { nom: 'done' }
  | { nom: 'taken' }
  | { nom: 'cancel'; precedent: 'idle' | 'done' }
  | { nom: 'liberee' };

export type EvenementMission =
  | { type: 'ACCEPTER' }
  | { type: 'CONFIRMEE' }
  | { type: 'DEJA_PRISE' }
  | { type: 'ECHEC_RESEAU' }
  | { type: 'DESISTER' }
  | { type: 'ANNULER' }
  | { type: 'CONFIRMER_DESISTEMENT' };

export const etatInitial: EtatMission = { nom: 'idle' };

export function transitionMission(etat: EtatMission, ev: EvenementMission): EtatMission {
  switch (etat.nom) {
    case 'idle':
      if (ev.type === 'ACCEPTER') return { nom: 'sending' };
      if (ev.type === 'DESISTER') return { nom: 'cancel', precedent: 'idle' };
      return etat;
    case 'sending':
      if (ev.type === 'CONFIRMEE') return { nom: 'done' };
      if (ev.type === 'DEJA_PRISE') return { nom: 'taken' };
      if (ev.type === 'ECHEC_RESEAU') return { nom: 'idle', erreurReseau: true };
      return etat;
    case 'done':
      if (ev.type === 'DESISTER') return { nom: 'cancel', precedent: 'done' };
      return etat;
    case 'cancel':
      if (ev.type === 'ANNULER') return { nom: etat.precedent };
      if (ev.type === 'CONFIRMER_DESISTEMENT') return { nom: 'liberee' };
      return etat;
    case 'taken':
    case 'liberee':
      return etat;
  }
}
