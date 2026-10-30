import { bornesMission, dateLongue, formatPlage, libellePoste, textesEcrans } from '@kivien/core';
import type { DemandeSuivi } from './donnees';
import { phaseDemande } from './phase';

const tn = textesEcrans.resto.notifications;

export interface Avis {
  /** Identifiant stable (une notification lue le reste). */
  id: string;
  /** Moment de l'événement (ms). */
  le: number;
  titre: string;
  detail: string;
  lien: string;
  type: 'accepte' | 'contrat' | 'desiste' | 'aNoter';
}

/**
 * Événements des demandes d'un établissement, du plus récent au plus ancien :
 * un extra a dit « mi lé la », a signé son contrat, s'est désisté ; une mission est à noter.
 */
export function notificationsDepuis(demandes: DemandeSuivi[], maintenant = Date.now()): Avis[] {
  const liste: Avis[] = [];
  for (const d of demandes) {
    if (d.statut === 'annulee') continue;
    const detail = `${libellePoste(d.poste, d.intitule, 'court')} · ${dateLongue(d.jour)} · ${formatPlage(d.debut, d.fin)}`;
    const lien = `/demandes/${d.id}`;
    for (const e of d.extras) {
      liste.push({ id: `accepte-${e.affectationId}`, le: Date.parse(e.confirmeLe), titre: tn.accepte(e.prenom), detail, lien, type: 'accepte' });
      if (e.contratSigneExtraLe) {
        liste.push({ id: `contrat-${e.affectationId}`, le: Date.parse(e.contratSigneExtraLe), titre: tn.contratSigne(e.prenom), detail, lien, type: 'contrat' });
      }
      if (e.statut === 'desistee') {
        liste.push({ id: `desiste-${e.affectationId}`, le: Date.parse(e.majLe), titre: tn.desiste(e.prenom), detail, lien, type: 'desiste' });
      }
      if (phaseDemande(d, maintenant) === 'aNoter' && !e.notation && e.statut !== 'desistee') {
        liste.push({
          id: `noter-${e.affectationId}`,
          le: bornesMission(d.jour, d.debut, d.fin).fin,
          titre: tn.aNoter(e.prenom),
          detail,
          lien: `${lien}/notation?affectation=${e.affectationId}`,
          type: 'aNoter',
        });
      }
    }
  }
  return liste.filter((n) => Number.isFinite(n.le) && n.le <= maintenant).sort((a, b) => b.le - a.le).slice(0, 30);
}

const cle = (restaurantId: string) => `kivien-notifications-lues-${restaurantId}`;

/** Moment de la dernière lecture des notifications de cet établissement, dans ce navigateur. */
export function luJusqua(restaurantId: string): number {
  try {
    return Number(localStorage.getItem(cle(restaurantId)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function marquerLu(restaurantId: string, le = Date.now()) {
  try {
    localStorage.setItem(cle(restaurantId), String(le));
  } catch {
    // Navigation privée : le compteur repart à chaque visite.
  }
}
