import Link from 'next/link';
import { Check, Clock, Pencil } from 'lucide-react';
import {
  aujourdhuiReunion,
  etiquetteJour,
  formatPlage,
  libellePoste,
  textesEcrans,
} from '@kivien/core';
import type { DemandeSuivi } from '@/lib/donnees';
import { extrasActifs, phaseDemande } from '@/lib/phase';
import p from './pages.module.css';
import { VignettePoste } from './VignettePoste';
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
    <Link
      href={`/demandes/${d.id}`}
      className={p.carteLien}
      data-trouve={phase !== 'recherche' && aSigner.length > 0 ? 'true' : undefined}
      aria-label={`${ta.voir} : ${formatPlage(d.debut, d.fin)}, ${jour.texte}`}>
      <div className={p.teteCarte}>
        <VignettePoste poste={d.poste} />
        <div className={p.teteTexte}>
          <div className={p.entreDeux}>
            <span className={ui.horaire}>{formatPlage(d.debut, d.fin)}</span>
            {jour.urgent ? (
              <span className={ui.badgeCurcuma}>{jour.texte}</span>
            ) : (
              <span className={`${ui.legendeForte} ${ui.galet}`}>{jour.texte}</span>
            )}
          </div>
          <span className={ui.corps}>
            {libellePoste(d.poste, d.intitule, 'court')} · {d.nbExtras} extra{d.nbExtras > 1 ? 's' : ''}
          </span>
        </div>
      </div>
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
          <span className={p.trouve}>
            <span className={`${p.ligne} ${ui.legendeForte} ${ui.vacoa}`}>
              <Check size={16} strokeWidth={2.5} aria-hidden />
              {ta.trouve} · {aSigner.map((e) => e.prenom).join(', ')}
            </span>
            <span className={`${p.ligne} ${ui.legendeForte}`}>
              <Pencil size={16} strokeWidth={2} aria-hidden />
              {ta.contratASigner}
            </span>
          </span>
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
