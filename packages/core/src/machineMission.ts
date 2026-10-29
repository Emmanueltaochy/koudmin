/**
 * Acceptation d'une mission côté extra.
 *
 *   idle → sending → done
 *               ↘ taken        (un autre extra a été plus rapide)
 *               ↘ idle         (échec réseau : on peut réessayer)
 *   done → cancel → (Annuler) done
 *                 → (Confirmer) liberation → liberee   (mission libérée, restaurant notifié)
 *                                          ↘ cancel    (échec réseau : on peut réessayer)
 *
 * Le désistement n'existe qu'une fois la mission confirmée : avant, l'extra n'a pris
 * aucun engagement et revient simplement en arrière.
 * Toute transition non prévue est ignorée (ex. double appui pendant l'envoi).
 */
export type EtatMission =
  | { nom: 'idle'; erreurReseau?: boolean }
  | { nom: 'sending' }
  | { nom: 'done' }
  | { nom: 'taken' }
  | { nom: 'cancel'; erreurReseau?: boolean }
  | { nom: 'liberation' }
  | { nom: 'liberee' };

export type EvenementMission =
  | { type: 'ACCEPTER' }
  | { type: 'CONFIRMEE' }
  | { type: 'DEJA_PRISE' }
  | { type: 'ECHEC_RESEAU' }
  | { type: 'DESISTER' }
  | { type: 'ANNULER' }
  | { type: 'CONFIRMER_DESISTEMENT' }
  | { type: 'LIBEREE' };

export const etatInitial: EtatMission = { nom: 'idle' };

/** État de départ selon le serveur : déjà confirmée par moi, prise par un autre, ou ouverte. */
export function etatDepuisServeur(m: { confirmee: boolean; disponible: boolean }): EtatMission {
  if (m.confirmee) return { nom: 'done' };
  if (!m.disponible) return { nom: 'taken' };
  return { nom: 'idle' };
}

export function transitionMission(etat: EtatMission, ev: EvenementMission): EtatMission {
  switch (etat.nom) {
    case 'idle':
      if (ev.type === 'ACCEPTER') return { nom: 'sending' };
      return etat;
    case 'sending':
      if (ev.type === 'CONFIRMEE') return { nom: 'done' };
      if (ev.type === 'DEJA_PRISE') return { nom: 'taken' };
      if (ev.type === 'ECHEC_RESEAU') return { nom: 'idle', erreurReseau: true };
      return etat;
    case 'done':
      if (ev.type === 'DESISTER') return { nom: 'cancel' };
      return etat;
    case 'cancel':
      if (ev.type === 'ANNULER') return { nom: 'done' };
      if (ev.type === 'CONFIRMER_DESISTEMENT') return { nom: 'liberation' };
      return etat;
    case 'liberation':
      if (ev.type === 'LIBEREE') return { nom: 'liberee' };
      if (ev.type === 'ECHEC_RESEAU') return { nom: 'cancel', erreurReseau: true };
      return etat;
    case 'taken':
    case 'liberee':
      return etat;
  }
}
