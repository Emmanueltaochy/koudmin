import { MessageSquare, Phone } from 'lucide-react';
import { formatMobileReunion, textesEcrans } from '@kivien/core';
import ui from './ui.module.css';

const ts = textesEcrans.resto.suivi;

/** Appeler ou écrire (SMS) à un extra, en un geste. `compact` : icônes seules, nom dans le libellé accessible. */
export function ContactExtra({ prenom, telephone, compact = false }: { prenom: string; telephone: string; compact?: boolean }) {
  if (!telephone) return null;
  if (compact) {
    return (
      <span className={ui.contactCompact}>
        <a href={`tel:${telephone}`} className={ui.boutonIcone} aria-label={`${ts.appeler} ${prenom}`}>
          <Phone size={18} strokeWidth={2} aria-hidden />
        </a>
        <a href={`sms:${telephone}`} className={ui.boutonIcone} aria-label={`${ts.ecrire} à ${prenom}`}>
          <MessageSquare size={18} strokeWidth={2} aria-hidden />
        </a>
      </span>
    );
  }
  return (
    <>
      <a href={`tel:${telephone}`} className={ui.boutonSecondaire}>
        <Phone size={18} strokeWidth={2} aria-hidden />
        {ts.appeler} {formatMobileReunion(telephone)}
      </a>
      <a href={`sms:${telephone}`} className={ui.boutonSecondaire}>
        <MessageSquare size={18} strokeWidth={2} aria-hidden />
        {ts.ecrire}
      </a>
    </>
  );
}
