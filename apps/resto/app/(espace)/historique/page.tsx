'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  dateLongue,
  dureeMinutes,
  formatEuros,
  formatHT,
  formatPlage,
  LIBELLES_POSTE,
  recapDemande,
  textesEcrans,
  totauxFacture,
} from '@koudmin/core';
import onglets from '@/components/Onglets.module.css';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { source } from '@/lib/donnees';
import { libelleMois } from '@/lib/identite';
import { aVenir, phaseDemande } from '@/lib/phase';
import { useDonnees } from '@/lib/useDonnees';

const th = textesEcrans.resto.historique;
type Onglet = 'historique' | 'factures' | 'favoris';

function Missions() {
  const { etat } = useDonnees((s) => s.demandes());
  if (etat.statut !== 'pret') return <div className={p.squelette} />;
  const passees = etat.donnees.filter((d) => !aVenir(d));
  if (!passees.length) return <p className={p.vide}>{th.aucuneMission}</p>;
  return (
    <ul className={p.liste}>
      {passees.map((d) => {
        const minutes = dureeMinutes(d.debut, d.fin) ?? 0;
        const venus = d.extras.filter((e) => e.statut === 'terminee' || e.statut === 'confirmee');
        const r = recapDemande({ minutes, tauxHoraireBrutCentimes: d.tauxHoraireBrutCentimes, nbExtras: venus.length, fraisMiseEnRelationHTCentimes: d.fraisMiseEnRelationHTCentimes });
        const phase = phaseDemande(d);
        return (
          <li key={d.id}>
            <Link href={`/demandes/${d.id}`} className={p.carteLien}>
              <div className={p.entreDeux}>
                <span className={ui.corpsFort}>{dateLongue(d.jour)}</span>
                <span className={phase === 'annulee' ? ui.badgeNeutre : phase === 'aNoter' ? ui.badgeCurcuma : ui.badgeNeutre}>
                  {phase === 'aNoter' ? textesEcrans.resto.accueil.noter : textesEcrans.resto.statuts[phase === 'annulee' ? 'annulee' : 'terminee']}
                </span>
              </div>
              <span className={ui.corps}>
                {formatPlage(d.debut, d.fin)} · {LIBELLES_POSTE[d.poste].court}
              </span>
              <span className={ui.legende}>
                {d.extras.length ? d.extras.map((e) => `${e.prenom}${e.statut === 'absente' ? ` (${textesEcrans.resto.statuts.absente.toLowerCase()})` : ''}`).join(', ') : '—'}
              </span>
              {phase !== 'annulee' && venus.length > 0 && (
                <div className={p.pied}>
                  <span className={ui.legende}>
                    {formatEuros(r.salairesBrutsCentimes)} brut · {formatHT(r.fraisHTCentimes)}
                  </span>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Factures() {
  const { etat } = useDonnees((s) => s.factures());
  if (etat.statut !== 'pret') return <div className={p.squelette} />;
  if (!etat.donnees.length) return <p className={p.vide}>{th.aucuneFacture}</p>;
  return (
    <ul className={p.liste}>
      {etat.donnees.map((f) => {
        const tot = totauxFacture(f.misesEnRelation, f.montantHTCentimes / f.misesEnRelation, f.tauxTVA);
        return (
          <li key={f.mois} className={ui.carte}>
            <div className={p.entreDeux}>
              <span className={ui.corpsFort}>{libelleMois(f.mois)}</span>
              <span className={ui.corpsFort}>{formatHT(tot.htCentimes)}</span>
            </div>
            <div className={p.entreDeux}>
              <span className={ui.legende}>
                {f.numero} · {th.misesEnRelation(f.misesEnRelation)}
              </span>
              <span className={ui.legende}>{formatEuros(tot.ttcCentimes)} TTC</span>
            </div>
            <Link href={`/factures/${f.mois}`} className={ui.lien}>
              {th.voirFacture}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Favoris() {
  const { etat, recharger } = useDonnees((s) => s.favoris());
  const [retrait, setRetrait] = useState<string | null>(null);
  if (etat.statut !== 'pret') return <div className={p.squelette} />;
  if (!etat.donnees.length) return <p className={p.vide}>{th.aucunFavori}</p>;
  return (
    <ul className={p.liste}>
      {etat.donnees.map((f) => (
        <li key={f.extraId} className={`${ui.carte} ${p.entreDeux}`}>
          <span>
            <span className={ui.corpsFort}>
              {f.prenom} {f.nom}
            </span>
            <br />
            <span className={ui.legende}>{th.missions(f.missions)}</span>
          </span>
          <button
            type="button"
            className={ui.lienDiscret}
            disabled={retrait === f.extraId}
            onClick={async () => {
              setRetrait(f.extraId);
              await source().retirerFavori(f.extraId);
              await recharger(true);
              setRetrait(null);
            }}
          >
            {th.retirer}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Historique() {
  const onglet = (useSearchParams().get('onglet') as Onglet | null) ?? 'historique';
  const liste: Onglet[] = ['historique', 'factures', 'favoris'];
  return (
    <div className={p.etroite}>
      <h1 className={ui.titre}>{th.titre}</h1>
      <nav aria-label={th.titre} className={onglets.onglets}>
        {liste.map((o) => (
          <Link
            key={o}
            href={o === 'historique' ? '/historique' : `/historique?onglet=${o}`}
            className={onglets.onglet}
            aria-current={onglet === o ? 'page' : undefined}
          >
            {th.onglets[o]}
          </Link>
        ))}
      </nav>
      {onglet === 'factures' ? <Factures /> : onglet === 'favoris' ? <Favoris /> : <Missions />}
    </div>
  );
}

export default function PageHistorique() {
  return (
    <Suspense>
      <Historique />
    </Suspense>
  );
}
