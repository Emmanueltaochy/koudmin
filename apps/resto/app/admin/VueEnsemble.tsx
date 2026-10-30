'use client';

import { useEffect, useState } from 'react';
import { formatEuros, LIBELLES_POSTE, textes as t, textesEcrans, type Poste } from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { VignettePoste } from '@/components/VignettePoste';
import { libelleMois } from '@/lib/identite';
import { source, type TableauAdmin } from '@/lib/donnees';
import s from './admin.module.css';

const ta = textesEcrans.resto.admin;
const PERIODES = [7, 30, 90, 365];

const pourcent = (n: number, sur: number) => (sur > 0 ? `${Math.round((n * 100) / sur)} %` : '–');
const duree = (min: number | null) => (min === null ? '–' : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`);

function Chiffre({ valeur, libelle, accent }: { valeur: string | number; libelle: string; accent?: boolean }) {
  return (
    <div className={s.chiffre} data-accent={accent ? 'true' : undefined}>
      <span className={s.valeur}>{valeur}</span>
      <span className={ui.legende}>{libelle}</span>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className={p.section} aria-label={titre}>
      <h2 className={ui.sousTitre}>{titre}</h2>
      <div className={s.chiffres}>{children}</div>
    </section>
  );
}

/** Vue d'ensemble : demande, offre, établissements, valeur, qualité, puis l'évolution mois par mois. */
export function VueEnsemble() {
  const [jours, setJours] = useState(30);
  const [etat, setEtat] = useState<TableauAdmin | 'chargement' | 'erreur'>('chargement');
  useEffect(() => {
    setEtat('chargement');
    source()
      .admin.tableau(jours)
      .then((r) => setEtat(r ?? 'erreur'))
      .catch(() => setEtat('erreur'));
  }, [jours]);

  const periodes = (
    <div className={s.periodes} role="radiogroup" aria-label={ta.periode}>
      {PERIODES.map((j) => (
        <button key={j} type="button" role="radio" aria-checked={jours === j} className={s.periode} onClick={() => setJours(j)}>
          {ta.periodes[j]}
        </button>
      ))}
    </div>
  );

  if (etat === 'chargement') return <>{periodes}<div className={p.squelette} aria-busy /></>;
  if (etat === 'erreur') return <>{periodes}<p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p></>;

  const { demande: d, offre: o, etablissements: e, valeur: v, qualite: q } = etat;
  const maxMois = Math.max(1, ...etat.par_mois.map((m) => m.frais_ht_centimes));
  const maxDemandes = Math.max(1, ...etat.par_mois.map((m) => m.demandes));
  const postes = (Object.entries(d.par_poste) as [Poste, number][]).sort((a, b) => b[1] - a[1]);
  const maxPoste = Math.max(1, ...postes.map(([, n]) => n));

  return (
    <>
      {periodes}

      <Bloc titre={ta.blocValeur}>
        <Chiffre valeur={formatEuros(v.frais_ht_centimes)} libelle={ta.caHT} accent />
        <Chiffre valeur={formatEuros(v.frais_ht_centimes + v.tva_centimes)} libelle={ta.caTTC} />
        <Chiffre valeur={formatEuros(v.tva_centimes)} libelle={ta.tva} />
        <Chiffre valeur={formatEuros(v.salaires_bruts_centimes)} libelle={ta.salaires} />
        <Chiffre valeur={v.missions_facturees} libelle={ta.missionsFacturees} />
        <Chiffre valeur={formatEuros(v.frais_a_venir_ht_centimes)} libelle={ta.aVenir} />
      </Bloc>

      <Bloc titre={ta.blocDemande}>
        <Chiffre valeur={d.demandes} libelle={ta.demandesPubliees} accent />
        <Chiffre valeur={d.places} libelle={ta.places} />
        <Chiffre valeur={d.pourvues} libelle={ta.pourvues} />
        <Chiffre valeur={pourcent(d.pourvues, d.places)} libelle={ta.tauxPourvoi} />
        <Chiffre valeur={duree(d.delai_median_minutes)} libelle={ta.delaiMedian} />
        <Chiffre valeur={d.en_recherche} libelle={ta.enRecherche} />
        <Chiffre valeur={d.annulees} libelle={ta.annulees} />
      </Bloc>

      <Bloc titre={ta.blocOffre}>
        <Chiffre valeur={o.extras} libelle={ta.extras} accent />
        <Chiffre valeur={o.nouveaux} libelle={ta.nouveauxExtras} />
        <Chiffre valeur={o.actifs} libelle={ta.actifs} />
        <Chiffre valeur={o.dispo_7_jours} libelle={ta.dispo7} />
        <Chiffre valeur={pourcent(o.avec_photo, o.extras)} libelle={ta.avecPhoto} />
      </Bloc>

      <Bloc titre={ta.blocEtablissements}>
        <Chiffre valeur={e.total} libelle={ta.etablissementsTotal} accent />
        <Chiffre valeur={e.nouveaux} libelle={ta.etablissementsNouveaux} />
        <Chiffre valeur={e.actifs} libelle={ta.etablissementsActifs} />
        <Chiffre valeur={e.utilisateurs} libelle={ta.utilisateurs} />
      </Bloc>

      <Bloc titre={ta.blocQualite}>
        <Chiffre valeur={q.note_moyenne === null ? '–' : `${String(q.note_moyenne).replace('.', ',')} / 5`} libelle={ta.noteMoyenne} accent />
        <Chiffre valeur={q.notations} libelle={ta.notations} />
        <Chiffre valeur={q.contrats_signes} libelle={ta.contratsSignes} />
        <Chiffre valeur={q.absences} libelle={ta.absences} />
        <Chiffre valeur={q.desistements} libelle={ta.desistements} />
      </Bloc>

      <section className={p.section} aria-labelledby="par-mois">
        <h2 id="par-mois" className={ui.sousTitre}>
          {ta.parMois}
        </h2>
        <div className={s.carte}>
          {etat.par_mois.length === 0 ? (
            <p className={ui.legende}>{ta.aucun}</p>
          ) : (
            <ul className={s.barres}>
              {etat.par_mois.map((m) => (
                <li key={m.mois} className={s.ligneBarre}>
                  <span className={s.moisLibelle}>{libelleMois(m.mois)}</span>
                  <span className={s.piste}>
                    <span className={s.barre} style={{ width: `${(m.frais_ht_centimes * 100) / maxMois}%` }} />
                    <span className={s.barreDemandes} style={{ width: `${(m.demandes * 100) / maxDemandes}%` }} />
                  </span>
                  <span className={s.moisChiffres}>
                    <strong>{formatEuros(m.frais_ht_centimes)} HT</strong>
                    <span className={ui.legende}>
                      {m.demandes} {ta.colonnes.demandes.toLowerCase()} · {m.pourvues}/{m.places} {ta.colonnes.pourvues.toLowerCase()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {postes.length > 0 && (
        <section className={p.section} aria-labelledby="par-poste">
          <h2 id="par-poste" className={ui.sousTitre}>
            {ta.parPoste}
          </h2>
          <div className={s.carte}>
            <ul className={s.barres}>
              {postes.map(([poste, n]) => (
                <li key={poste} className={s.ligneBarre}>
                  <span className={`${p.ligne} ${s.moisLibelle}`}>
                    <VignettePoste poste={poste} taille={28} />
                    {LIBELLES_POSTE[poste].court}
                  </span>
                  <span className={s.piste}>
                    <span className={s.barreDemandes} style={{ width: `${(n * 100) / maxPoste}%` }} />
                  </span>
                  <strong className={s.moisChiffres}>{n}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
