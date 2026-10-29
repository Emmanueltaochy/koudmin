import Link from 'next/link';
import { Check, Clock, Pencil } from 'lucide-react';
import {
  aujourdhuiReunion,
  etiquetteJour,
  formatPlage,
  LIBELLES_POSTE,
  textesEcrans,
} from '@kivien/core';
import type { DemandeSuivi } from '@/lib/donnees';
import { extrasActifs, phaseDemande } from '@/lib/phase';
import p from './pages.module.css';
import ui from './ui.module.css';

const ta = textesEcrans.resto.accueil;

/** Carte d'une demande à venir : horaire, poste, puis où en est la recherche. */
export function CarteDemande({ demande: d }: { demande: DemandeSuivi }) {
  const jour = etiquetteJour(d.jour, d.debut, aujourdhuiReunion());
  const actifs = extrasActifs(d);
  const phase = phaseDemande(d);
  const aSigner = actifs.filter((e) => !e.contratSigneRestaurant);
  const prenoms = actifs.map((e) => e.prenom).join(', ');

  return (
    <Link href={`/demandes/${d.id}`} className={p.carteLien} aria-label={`${ta.voir} : ${formatPlage(d.debut, d.fin)}, ${jour.texte}`}>
      <div className={p.entreDeux}>
        <span className={ui.horaire}>{formatPlage(d.debut, d.fin)}</span>
        {jour.urgent ? (
          <span className={ui.badgeCurcuma}>{jour.texte}</span>
        ) : (
          <span className={`${ui.legendeForte} ${ui.galet}`}>{jour.texte}</span>
        )}
      </div>
      <span className={ui.corps}>
        {LIBELLES_POSTE[d.poste].court} · {d.nbExtras} extra{d.nbExtras > 1 ? 's' : ''}
      </span>
      <div className={p.pied}>
        {phase === 'recherche' && (
          <>
            <Clock size={16} strokeWidth={2} className={ui.galet} aria-hidden />
            <span className={ui.legendeForte}>
              {ta.recherche}
              {actifs.length > 0 && ` · ${actifs.length} sur ${d.nbExtras}`}
            </span>
          </>
        )}
        {phase !== 'recherche' && aSigner.length > 0 && (
          <>
            <Pencil size={16} strokeWidth={2} aria-hidden />
            <span className={ui.legendeForte}>
              {ta.contratASigner} · {aSigner.map((e) => e.prenom).join(', ')}
            </span>
          </>
        )}
        {phase !== 'recherche' && aSigner.length === 0 && (
          <>
            <Check size={16} strokeWidth={2.5} className={ui.vacoa} aria-hidden />
            <span className={`${ui.legendeForte} ${ui.vacoa}`}>{prenoms}</span>
          </>
        )}
      </div>
    </Link>
  );
}
