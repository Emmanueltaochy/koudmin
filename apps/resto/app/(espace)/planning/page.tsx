'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  ajouterJours,
  aujourdhuiReunion,
  dateLongue,
  formatPlage,
  jourCourt,
  jourMoisCourt,
  joursDeLaSemaine,
  libellePoste,
  lundiDeLaSemaine,
  resumeProfil,
  textes as t,
  textesEcrans,
} from '@kivien/core';
import { AvatarExtra } from '@/components/AvatarExtra';
import { ContactExtra } from '@/components/ContactExtra';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { lignesPlanning, type Creneau, type LignePlanning } from '@/lib/planning';
import { useDonnees } from '@/lib/useDonnees';
import s from './planning.module.css';

const tp = textesEcrans.resto.planning;

function Bloc({ c }: { c: Creneau }) {
  const d = c.demande;
  return (
    <Link href={`/demandes/${d.id}`} className={s.bloc} data-recherche={c.restants ? 'true' : undefined}>
      <span className={s.horaire}>{formatPlage(d.debut, d.fin)}</span>
      <span className={ui.legende}>
        {libellePoste(d.poste, d.intitule, 'court')}
        {c.restants ? ` · ${c.restants} ${tp.aTrouver}` : ''}
      </span>
    </Link>
  );
}

function EnTeteLigne({ l }: { l: LignePlanning }) {
  if (!l.extra) {
    return (
      <div className={s.personne}>
        <span className={s.iconeRecherche} aria-hidden>
          <Clock size={20} strokeWidth={2} />
        </span>
        <span className={ui.corpsFort}>{tp.recherche}</span>
      </div>
    );
  }
  const e = l.extra;
  return (
    <div className={s.personne}>
      <AvatarExtra extraId={e.extraId} prenom={e.prenom} nom={e.nom} alt={`${textesEcrans.resto.suivi.photoDe} ${e.prenom}`} taille={44} />
      <div className={s.identite}>
        <span className={ui.corpsFort}>
          {e.prenom} {e.nom}
        </span>
        {resumeProfil(e) && <span className={ui.legende}>{resumeProfil(e)}</span>}
        <ContactExtra prenom={e.prenom} telephone={e.telephone} compact />
      </div>
    </div>
  );
}

/** Semaine en un coup d'œil : qui vient quand, et les places encore à pourvoir. */
export default function Planning() {
  const [decalage, setDecalage] = useState(0);
  const lundi = ajouterJours(lundiDeLaSemaine(aujourdhuiReunion()), decalage * 7);
  const jours = joursDeLaSemaine(lundi);
  const aujourdhui = aujourdhuiReunion();
  const { etat } = useDonnees((src) => src.demandes());

  const lignes = etat.statut === 'pret' ? lignesPlanning(etat.donnees, jours) : [];
  const libelleSemaine = `${jourMoisCourt(jours[0]!)} – ${jourMoisCourt(jours[6]!)}`;

  return (
    <div className={p.page}>
      <div className={p.entreDeux}>
        <h1 className={ui.titre}>{tp.titre}</h1>
      </div>

      <div className={s.navigation}>
        <button type="button" className={ui.boutonIcone} onClick={() => setDecalage((x) => x - 1)} aria-label={tp.semainePrecedente}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        </button>
        <span className={ui.sousTitre} aria-live="polite">
          {libelleSemaine}
        </span>
        <button type="button" className={ui.boutonIcone} onClick={() => setDecalage((x) => x + 1)} aria-label={tp.semaineSuivante}>
          <ChevronRight size={20} strokeWidth={2} aria-hidden />
        </button>
        {decalage !== 0 && (
          <button type="button" className={ui.lien} onClick={() => setDecalage(0)}>
            {tp.cetteSemaine}
          </button>
        )}
      </div>

      {etat.statut === 'chargement' && <div className={p.squelette} aria-busy />}
      {etat.statut === 'erreur' && <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p>}
      {etat.statut === 'pret' && lignes.length === 0 && <p className={p.vide}>{tp.aucune}</p>}

      {lignes.length > 0 && (
        <>
          {/* Grand écran : grille extras × jours. */}
          <div className={s.defilement}>
            <table className={s.grille}>
              <caption className="sr-only">
                {tp.titre} {libelleSemaine}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={s.colonnePersonne}>
                    {tp.extras}
                  </th>
                  {jours.map((j) => (
                    <th key={j} scope="col" data-aujourdhui={j === aujourdhui ? 'true' : undefined}>
                      {jourCourt(j)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.extra?.extraId ?? 'recherche'}>
                    <th scope="row" className={s.colonnePersonne}>
                      <EnTeteLigne l={l} />
                    </th>
                    {jours.map((j) => (
                      <td key={j} data-aujourdhui={j === aujourdhui ? 'true' : undefined}>
                        {(l.parJour[j] ?? []).map((c) => (
                          <Bloc key={c.demande.id} c={c} />
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : un jour après l'autre. */}
          <ol className={s.parJour}>
            {jours
              .filter((j) => lignes.some((l) => l.parJour[j]?.length))
              .map((j) => (
                <li key={j} className={p.section}>
                  <h2 className={ui.sousTitre}>{dateLongue(j)}</h2>
                  <ul className={p.liste}>
                    {lignes
                      .filter((l) => l.parJour[j]?.length)
                      .map((l) => (
                        <li key={l.extra?.extraId ?? 'recherche'} className={s.carteJour}>
                          <EnTeteLigne l={l} />
                          <div className={s.blocs}>
                            {l.parJour[j]!.map((c) => (
                              <Bloc key={c.demande.id} c={c} />
                            ))}
                          </div>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
          </ol>
        </>
      )}
    </div>
  );
}
