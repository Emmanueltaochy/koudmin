'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, Star } from 'lucide-react';
import {
  etatMissionFiche,
  formatEuros,
  formatHeure,
  formatMobileReunion,
  formatPlage,
  jourCourt,
  LIBELLES_ETAT_MISSION,
  LIBELLES_EXPERIENCE,
  LIBELLES_LANGUE,
  LIBELLES_POSTE,
  libellePoste,
  minuteReunion,
  brutMissionCentimes,
  resumeFicheExtra,
  resumeOrigine,
  textes as t,
  textesFicheExtra as tf,
  textesOrigine,
  type Experience,
  type Langue,
  type MissionFicheExtra,
} from '@kivien/core';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { source, type FicheExtraAdmin } from '@/lib/donnees';
import s from './admin.module.css';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Indian/Reunion' });
const heure = (iso: string | null) => (iso ? formatHeure(minuteReunion(new Date(iso))) : null);

function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className={s.ficheLigne}>
      <dt className={`${ui.legende} ${ui.galet}`}>{libelle}</dt>
      <dd className={ui.corps}>{children}</dd>
    </div>
  );
}

function Chiffre({ libelle, valeur, aide }: { libelle: string; valeur: string; aide?: string }) {
  return (
    <div className={s.chiffre}>
      <span className={`${ui.legende} ${ui.galet}`}>{libelle}</span>
      <span className={s.valeur}>{valeur}</span>
      {aide && <span className={`${ui.legende} ${ui.galet}`}>{aide}</span>}
    </div>
  );
}

function contrat(m: MissionFicheExtra): string {
  if (m.contratSigneExtra && m.contratSigneRestaurant) return tf.contrat.signe;
  if (m.contratSigneExtra) return tf.contrat.extra;
  if (m.contratSigneRestaurant) return tf.contrat.etablissement;
  return tf.contrat.aucun;
}

/** Fiche d'un extra : chiffres, profil, dossier, origine et toutes ses missions. */
export function FicheExtra({ id, onRetour }: { id: string; onRetour: () => void }) {
  const [fiche, setFiche] = useState<FicheExtraAdmin | null | 'chargement' | 'erreur'>(
    'chargement',
  );
  useEffect(() => {
    source()
      .admin.ficheExtra(id)
      .then(setFiche)
      .catch(() => setFiche('erreur'));
  }, [id]);

  const retour = (
    <button type="button" className={p.retour} onClick={onRetour}>
      <ChevronLeft size={20} strokeWidth={2} aria-hidden />
      {tf.retour}
    </button>
  );
  if (fiche === 'chargement') return <div className={p.squelette} aria-busy />;
  if (fiche === 'erreur' || fiche === null)
    return (
      <>
        {retour}
        <p className={ui.sousTitre}>
          {fiche === 'erreur' ? t.extra.missions.horsLigneTitre : tf.introuvable}
        </p>
      </>
    );

  const f = fiche;
  const r = resumeFicheExtra(f.missions);
  const c = tf.champs;
  const v = tf.valeurs;
  return (
    <div className={s.fiche}>
      {retour}
      <div>
        <h2 className={ui.titre}>
          {f.prenom} {f.nom}
        </h2>
        <p className={`${ui.corps} ${ui.galet}`}>
          {f.commune} · {c.inscription} le {date(f.inscritLe)}
        </p>
      </div>

      <div className={s.chiffres}>
        <Chiffre libelle={tf.chiffres.faites} valeur={String(r.faites)} />
        <Chiffre libelle={tf.chiffres.aVenir} valeur={String(r.aVenir)} />
        <Chiffre
          libelle={tf.chiffres.brut}
          valeur={formatEuros(r.brutFaitCentimes)}
          aide={`${tf.chiffres.brutAide} ${r.netFaitEuros} €`}
        />
        <Chiffre libelle={tf.chiffres.aVenirBrut} valeur={formatEuros(r.brutAVenirCentimes)} />
        <Chiffre
          libelle={tf.chiffres.note}
          valeur={
            r.noteMoyenneDixiemes === null
              ? '–'
              : `${Math.floor(r.noteMoyenneDixiemes / 10)},${r.noteMoyenneDixiemes % 10} / 5`
          }
          aide={r.notes ? `${r.notes} note${r.notes > 1 ? 's' : ''}` : undefined}
        />
        <Chiffre
          libelle={tf.chiffres.fiabilite}
          valeur={`${r.absences} / ${r.desistements}`}
          aide={r.desistementsTardifs ? `${r.desistementsTardifs} ${tf.tardif}` : undefined}
        />
        <Chiffre libelle={tf.chiffres.etablissements} valeur={String(r.etablissements)} />
      </div>

      <div className={s.ficheColonnes}>
        <section className={s.carte} aria-labelledby="fiche-profil">
          <h3 id="fiche-profil" className={ui.sousTitre}>
            {tf.sections.profil}
          </h3>
          <dl>
            <Ligne libelle={c.mobile}>
              <a href={`tel:${f.telephone}`} className={ui.lienDiscret}>
                {formatMobileReunion(f.telephone)}
              </a>
            </Ligne>
            <Ligne libelle={c.email}>
              {f.email ? (
                <a href={`mailto:${f.email}`} className={ui.lienDiscret}>
                  {f.email}
                </a>
              ) : (
                v.pasDAdresse
              )}
            </Ligne>
            <Ligne libelle={c.commune}>{f.commune}</Ligne>
            <Ligne libelle={c.voiture}>{f.aVoiture ? v.oui : v.non}</Ligne>
            <Ligne libelle={c.metiers}>
              {f.competences.map((x) => LIBELLES_POSTE[x].court).join(', ') || '–'}
            </Ligne>
            <Ligne libelle={c.experience}>
              {f.experience
                ? (LIBELLES_EXPERIENCE[f.experience as Experience] ?? f.experience)
                : '–'}
            </Ligne>
            <Ligne libelle={c.langues}>
              {f.langues.map((x) => LIBELLES_LANGUE[x as Langue] ?? x).join(', ') || '–'}
            </Ligne>
            <Ligne libelle={c.presentation}>{f.presentation || '–'}</Ligne>
          </dl>
        </section>
        <section className={s.carte} aria-labelledby="fiche-dossier">
          <h3 id="fiche-dossier" className={ui.sousTitre}>
            {tf.sections.dossier}
          </h3>
          <dl>
            <Ligne libelle={c.infosContrat}>
              {f.dossierComplet ? v.renseignees : v.aCompleter}
            </Ligne>
            <Ligne libelle={c.cgu}>
              {f.cguVersion ? v.acceptees(f.cguVersion) : v.nonAcceptees}
            </Ligne>
            <Ligne libelle={c.photo}>{f.avecPhoto ? v.oui : v.non}</Ligne>
            <Ligne libelle={c.alertes}>{f.alertesEmail ? v.activees : v.coupees}</Ligne>
            <Ligne libelle={c.dispos}>{String(f.dispos14Jours)}</Ligne>
          </dl>
          <h3 className={ui.sousTitre}>{tf.sections.origine}</h3>
          <dl>
            <Ligne libelle={c.reponse}>
              {f.origine?.commentConnu ? textesOrigine.canaux[f.origine.commentConnu] : '–'}
            </Ligne>
            <Ligne libelle={c.premiereVisite}>
              {f.origine?.page ? resumeOrigine(f.origine) : '–'}
            </Ligne>
          </dl>
        </section>
      </div>

      <section aria-labelledby="fiche-missions">
        <h3 id="fiche-missions" className={ui.sousTitre}>
          {tf.sections.missions} · {f.missions.length}
        </h3>
        {f.missions.length === 0 ? (
          <p className={`${ui.legende} ${ui.galet}`}>{tf.aucuneMission}</p>
        ) : (
          <div className={s.defilement}>
            <table className={s.tableau}>
              <thead>
                <tr>
                  <th scope="col">{tf.colonnes.date}</th>
                  <th scope="col">{tf.colonnes.etablissement}</th>
                  <th scope="col">{tf.colonnes.poste}</th>
                  <th scope="col">{tf.colonnes.etat}</th>
                  <th scope="col">{tf.colonnes.contrat}</th>
                  <th scope="col">{tf.colonnes.pointage}</th>
                  <th scope="col">{tf.colonnes.note}</th>
                  <th scope="col">{tf.colonnes.brut}</th>
                </tr>
              </thead>
              <tbody>
                {f.missions.map((m) => {
                  const etat = etatMissionFiche(m);
                  return (
                    <tr key={m.affectationId}>
                      <th scope="row">
                        {jourCourt(m.jour)}
                        <span className={s.sousLigne}>{formatPlage(m.debut, m.fin)}</span>
                      </th>
                      <td className={s.cellTexte}>
                        {m.etablissement}
                        {m.favori && (
                          <span className={s.sousLigne}>
                            <Star size={12} strokeWidth={2} aria-hidden /> {tf.favori}
                          </span>
                        )}
                      </td>
                      <td className={s.cellTexte}>{libellePoste(m.poste, m.intitule, 'court')}</td>
                      <td>
                        {LIBELLES_ETAT_MISSION[etat]}
                        {etat === 'desistee' && m.desistementTardif ? ` (${tf.tardif})` : ''}
                      </td>
                      <td className={s.cellTexte}>{contrat(m)}</td>
                      <td>
                        {heure(m.arriveeLe)
                          ? `${heure(m.arriveeLe)} – ${heure(m.departLe) ?? '…'}`
                          : '–'}
                      </td>
                      <td>{m.note ?? '–'}</td>
                      <td>
                        {etat === 'faite' || etat === 'a_venir'
                          ? formatEuros(brutMissionCentimes(m))
                          : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
