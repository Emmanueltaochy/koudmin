'use client';

import { useEffect, useState } from 'react';
import {
  LIBELLES_POSTE,
  LIBELLES_ZONE,
  POSTES,
  textes as t,
  textesEcrans,
  ZONES,
  zoneDuLieu,
  type Poste,
  type Zone,
} from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { VignettePoste } from '@/components/VignettePoste';
import { source, type Statistiques } from '@/lib/donnees';
import s from './admin.module.css';

const ta = textesEcrans.resto.admin;
type Colonne = Zone | 'autre';
const COLONNES: Colonne[] = [...ZONES, 'autre'];
const libelle = (c: Colonne) => (c === 'autre' ? ta.autre : LIBELLES_ZONE[c]);

/** Recrutement : extras et établissements par zone et par métier, sans donnée personnelle. */
export function Recrutement() {
  const [etat, setEtat] = useState<{ statut: 'chargement' } | { statut: 'refuse' } | { statut: 'erreur' } | { statut: 'pret'; s: Statistiques }>({
    statut: 'chargement',
  });
  useEffect(() => {
    source()
      .statistiques()
      .then((r) => setEtat(r ? { statut: 'pret', s: r } : { statut: 'refuse' }))
      .catch(() => setEtat({ statut: 'erreur' }));
  }, []);

  if (etat.statut === 'chargement') return <div className={p.squelette} aria-busy />;
  if (etat.statut === 'refuse') return <p className={p.vide}>{ta.reserve}</p>;
  if (etat.statut === 'erreur') return <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p>;

  const { extras, etablissements } = etat.s;
  const zoneExtra = extras.map((e) => ({ e, z: (zoneDuLieu(e.commune) ?? 'autre') as Colonne }));
  const zoneEtab = etablissements.map((r) => (zoneDuLieu(r.commune, r.lat, r.lng) ?? 'autre') as Colonne);
  const ilYa7Jours = Date.now() - 7 * 86400e3;
  const compter = (z: Colonne, f: (e: Statistiques['extras'][number]) => boolean = () => true) =>
    zoneExtra.filter((x) => x.z === z && f(x.e)).length;
  const colonnes = COLONNES.filter((c) => c !== 'autre' || zoneExtra.some((x) => x.z === 'autre') || zoneEtab.includes('autre'));
  const metiers = POSTES.filter((m: Poste) => extras.some((e) => e.competences.includes(m)));

  return (
    <>
      <div className={s.chiffres}>
        {[
          [ta.extras, extras.length],
          [ta.nouveaux, extras.filter((e) => Date.parse(e.inscritLe) >= ilYa7Jours).length],
          [ta.libresWeekEnd, extras.filter((e) => e.dispoWeekEnd).length],
          [ta.etablissements, etablissements.length],
        ].map(([l, v]) => (
          <div key={l} className={s.chiffre}>
            <span className={s.valeur}>{v}</span>
            <span className={ui.legende}>{l}</span>
          </div>
        ))}
      </div>

      <section className={p.section} aria-labelledby="par-zone">
        <h2 id="par-zone" className={ui.sousTitre}>
          {ta.parZone}
        </h2>
        <div className={s.defilement}>
          <table className={s.tableau}>
            <thead>
              <tr>
                <th scope="col">{ta.zone}</th>
                <th scope="col">{ta.extras}</th>
                <th scope="col">{ta.libresWeekEnd}</th>
                <th scope="col">{ta.avecVoiture}</th>
                <th scope="col">{ta.etablissements}</th>
              </tr>
            </thead>
            <tbody>
              {colonnes.map((z) => (
                <tr key={z}>
                  <th scope="row">{libelle(z)}</th>
                  <td>{compter(z)}</td>
                  <td>{compter(z, (e) => e.dispoWeekEnd)}</td>
                  <td>{compter(z, (e) => e.aVoiture)}</td>
                  <td>{zoneEtab.filter((x) => x === z).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={p.section} aria-labelledby="par-metier">
        <h2 id="par-metier" className={ui.sousTitre}>
          {ta.parMetier}
        </h2>
        {metiers.length === 0 ? (
          <p className={p.vide}>{ta.aucun}</p>
        ) : (
          <div className={s.defilement}>
            <table className={s.tableau}>
              <thead>
                <tr>
                  <th scope="col">{ta.metier}</th>
                  {colonnes.map((z) => (
                    <th key={z} scope="col">
                      {libelle(z)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metiers.map((m) => (
                  <tr key={m}>
                    <th scope="row">
                      <span className={p.ligne}>
                        <VignettePoste poste={m} taille={28} />
                        {LIBELLES_POSTE[m].court}
                      </span>
                    </th>
                    {colonnes.map((z) => (
                      <td key={z}>{compter(z, (e) => e.competences.includes(m))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

