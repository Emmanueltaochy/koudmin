'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFINITION_SECTEURS,
  estSecteur,
  formatEuros,
  formatMobileReunion,
  formatPlage,
  jourCourt,
  LIBELLES_EXPERIENCE,
  LIBELLES_POSTE,
  libellePoste,
  resumeOrigine,
  textes as t,
  textesEcrans,
  textesOrigine,
  CANAUX_CONNU,
  type Experience,
} from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import {
  source,
  type DemandeAdmin,
  type EtablissementAdmin,
  type ExtraAdmin,
  type OrigineAdmin,
} from '@/lib/donnees';
import s from './admin.module.css';

const ta = textesEcrans.resto.admin;
const c = ta.colonnes;
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Indian/Reunion' }) : '–';
const sansAccents = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Chargement d'une liste de l'espace administrateur, avec recherche plein texte. */
function useListe<T>(charger: () => Promise<T[]>, texte: (x: T) => string) {
  const [lignes, setLignes] = useState<T[] | 'chargement' | 'erreur'>('chargement');
  const [recherche, setRecherche] = useState('');
  useEffect(() => {
    charger()
      .then(setLignes)
      .catch(() => setLignes('erreur'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filtrees = useMemo(
    () =>
      Array.isArray(lignes)
        ? lignes.filter((x) => sansAccents(texte(x)).includes(sansAccents(recherche.trim())))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lignes, recherche],
  );
  const champ = (
    <span className={`${ui.champ} ${s.recherche}`}>
      <input
        type="search"
        placeholder={ta.rechercher}
        aria-label={ta.rechercher}
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />
    </span>
  );
  return { lignes, filtrees, champ };
}

const to = textesOrigine;

/** Origines des inscrits d'un type, par identifiant (vide si la lecture échoue). */
function useOrigines(type: OrigineAdmin['type']) {
  const [origines, setOrigines] = useState<Map<string, OrigineAdmin>>(new Map());
  useEffect(() => {
    source()
      .admin.origines()
      .then((l) => setOrigines(new Map(l.filter((o) => o.type === type).map((o) => [o.id, o]))))
      .catch(() => undefined);
  }, [type]);
  return origines;
}

/** Cellule « Origine » : réponse à la question, puis site d'origine et page d'arrivée. */
function CelluleOrigine({ o }: { o: OrigineAdmin | undefined }) {
  if (!o) return <td>–</td>;
  return (
    <td className={s.cellTexte}>
      {o.commentConnu ? to.canaux[o.commentConnu] : '–'}
      <span className={s.sousLigne}>{resumeOrigine(o)}</span>
    </td>
  );
}

/** « Recherche Google : 3 · Un ami, un proche : 1 · Sans réponse : 2 » */
function BilanOrigines({
  origines,
  total,
  avecReponse = true,
}: {
  origines: Map<string, OrigineAdmin>;
  total: number;
  avecReponse?: boolean;
}) {
  const parCanal = CANAUX_CONNU.map(
    (k) =>
      [to.canaux[k], [...origines.values()].filter((o) => o.commentConnu === k).length] as const,
  ).filter(([, n]) => n > 0);
  const sites = new Map<string, number>();
  for (const o of origines.values()) {
    const site = resumeOrigine({ ...o, page: null });
    sites.set(site, (sites.get(site) ?? 0) + 1);
  }
  const sansReponse = total - parCanal.reduce((a, [, n]) => a + n, 0);
  if (!origines.size) return <p className={ui.legende}>{to.admin.bilanVide}</p>;
  return (
    <div className={s.bilanOrigines} aria-label={to.admin.titreBilan}>
      <span className={ui.corpsFort}>{to.admin.titreBilan}</span>
      {avecReponse && (
        <span className={ui.legende}>
          {to.admin.reponse} :{' '}
          {[
            ...parCanal.map(([l, n]) => `${l} : ${n}`),
            `${to.admin.sansReponse} : ${sansReponse}`,
          ].join(' · ')}
        </span>
      )}
      <span className={ui.legende}>
        {to.admin.premiereVisite} :{' '}
        {[...sites.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([l, n]) => `${l} : ${n}`)
          .join(' · ')}
      </span>
    </div>
  );
}

function Etat({ lignes }: { lignes: unknown[] | 'chargement' | 'erreur' }) {
  if (lignes === 'chargement') return <div className={p.squelette} aria-busy />;
  if (lignes === 'erreur')
    return <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p>;
  return null;
}

export function ListeDemandes() {
  const { lignes, filtrees, champ } = useListe(
    () => source().admin.demandes(300),
    (d: DemandeAdmin) =>
      `${d.etablissement} ${d.commune} ${libellePoste(d.poste, d.intitule, 'court')} ${ta.statuts[d.statut]}`,
  );
  if (!Array.isArray(lignes)) return <Etat lignes={lignes} />;
  return (
    <>
      {champ}
      <div className={s.defilement}>
        <table className={s.tableau}>
          <thead>
            <tr>
              <th scope="col">{c.etablissement}</th>
              <th scope="col">{c.poste}</th>
              <th scope="col">{c.jour}</th>
              <th scope="col">{c.horaires}</th>
              <th scope="col">{c.pourvues}</th>
              <th scope="col">{c.statut}</th>
              <th scope="col">{c.delai}</th>
              <th scope="col">{c.publiee}</th>
            </tr>
          </thead>
          <tbody>
            {filtrees.map((d) => (
              <tr key={d.id}>
                <th scope="row">
                  {d.etablissement}
                  <span className={s.sousLigne}>{d.commune}</span>
                </th>
                <td>{libellePoste(d.poste, d.intitule, 'court')}</td>
                <td>{jourCourt(d.jour)}</td>
                <td>{formatPlage(d.debut, d.fin)}</td>
                <td>
                  {d.pourvues}/{d.nbExtras}
                </td>
                <td>
                  <span className={s.statut} data-statut={d.statut}>
                    {ta.statuts[d.statut]}
                  </span>
                </td>
                <td>{d.delaiMinutes === null ? '–' : `${d.delaiMinutes} min`}</td>
                <td>{date(d.publieeLe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ListeExtras() {
  const { lignes, filtrees, champ } = useListe(
    () => source().admin.extras(),
    (e: ExtraAdmin) =>
      `${e.prenom} ${e.nom} ${e.commune} ${e.telephone} ${e.competences.map((x) => LIBELLES_POSTE[x].court).join(' ')}`,
  );
  const origines = useOrigines('extra');
  if (!Array.isArray(lignes)) return <Etat lignes={lignes} />;
  return (
    <>
      <BilanOrigines origines={origines} total={lignes.length} />
      {champ}
      <div className={s.defilement}>
        <table className={s.tableau}>
          <thead>
            <tr>
              <th scope="col">{c.extra}</th>
              <th scope="col">{c.mobile}</th>
              <th scope="col">{c.metiers}</th>
              <th scope="col">{c.missions}</th>
              <th scope="col">{c.note}</th>
              <th scope="col">{c.fiabilite}</th>
              <th scope="col">{c.dispo}</th>
              <th scope="col">{to.admin.colonne}</th>
              <th scope="col">{c.inscrit}</th>
            </tr>
          </thead>
          <tbody>
            {filtrees.map((e) => (
              <tr key={e.id}>
                <th scope="row">
                  {e.prenom} {e.nom}
                  <span className={s.sousLigne}>
                    {e.commune}
                    {e.experience
                      ? ` · ${LIBELLES_EXPERIENCE[e.experience as Experience] ?? ''}`
                      : ''}
                  </span>
                </th>
                <td>
                  <a href={`tel:${e.telephone}`} className={ui.lienDiscret}>
                    {formatMobileReunion(e.telephone)}
                  </a>
                </td>
                <td className={s.cellTexte}>
                  {e.competences.map((x) => LIBELLES_POSTE[x].court).join(', ') || '–'}
                </td>
                <td>{e.missions}</td>
                <td>{e.noteMoyenne === null ? '–' : String(e.noteMoyenne).replace('.', ',')}</td>
                <td>
                  {e.absences} / {e.desistements}
                </td>
                <td>{e.dispo7Jours ? ta.oui : ta.non}</td>
                <CelluleOrigine o={origines.get(e.id)} />
                <td>{date(e.inscritLe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ListeEtablissements() {
  const { lignes, filtrees, champ } = useListe(
    () => source().admin.etablissements(),
    (r: EtablissementAdmin) =>
      `${r.nom} ${r.commune ?? ''} ${r.siret ?? ''} ${estSecteur(r.secteur) ? DEFINITION_SECTEURS[r.secteur].libelle : ''}`,
  );
  const origines = useOrigines('etablissement');
  if (!Array.isArray(lignes)) return <Etat lignes={lignes} />;
  return (
    <>
      <BilanOrigines origines={origines} total={lignes.length} avecReponse={false} />
      {champ}
      <div className={s.defilement}>
        <table className={s.tableau}>
          <thead>
            <tr>
              <th scope="col">{c.etablissement}</th>
              <th scope="col">{c.secteur}</th>
              <th scope="col">{c.utilisateurs}</th>
              <th scope="col">{c.demandes}</th>
              <th scope="col">{c.pourvues}</th>
              <th scope="col">{c.ca}</th>
              <th scope="col">{c.derniere}</th>
              <th scope="col">{to.admin.colonne}</th>
              <th scope="col">{c.inscrit}</th>
            </tr>
          </thead>
          <tbody>
            {filtrees.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  {r.nom}
                  <span className={s.sousLigne}>
                    {r.commune ?? '–'}
                    {r.telephone ? ` · ${formatMobileReunion(r.telephone)}` : ''}
                  </span>
                </th>
                <td className={s.cellTexte}>
                  {estSecteur(r.secteur) ? DEFINITION_SECTEURS[r.secteur].libelle : r.secteur}
                </td>
                <td>{r.utilisateurs}</td>
                <td>{r.demandes}</td>
                <td>{r.placesPourvues}</td>
                <td>{formatEuros(r.fraisHTCentimes)}</td>
                <td>{date(r.derniereDemande)}</td>
                <CelluleOrigine o={origines.get(r.id)} />
                <td>{date(r.inscritLe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
