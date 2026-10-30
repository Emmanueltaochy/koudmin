'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Clock, FileText, MapPin, Shirt } from 'lucide-react';
import {
  dateLongue,
  dureeMinutes,
  formatEuros,
  formatHeure,
  formatHT,
  formatPlage,
  legendeFrais,
  legendeSalaires,
  LIBELLES_POSTE,
  minuteReunion,
  notificationConfirmation,
  recapDemande,
  resumeProfil,
  textes as t,
  textesEcrans,
} from '@kivien/core';
import p from '@/components/pages.module.css';
import { AvatarExtra } from '@/components/AvatarExtra';
import { ContactExtra } from '@/components/ContactExtra';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source, type DemandeSuivi } from '@/lib/donnees';
import { extrasActifs, phaseDemande } from '@/lib/phase';
import { useDonnees } from '@/lib/useDonnees';
import s from './suivi.module.css';

const ts = textesEcrans.resto.suivi;

export default function SuiviDemande() {
  const { id } = useParams<{ id: string }>();
  const { etat } = useDonnees((src) => src.demande(id), [id]);
  const [annulation, setAnnulation] = useState<'ferme' | 'question' | 'envoi'>('ferme');
  const [nouveau, setNouveau] = useState<string | null>(null);
  const connus = useRef<Set<string> | null>(null);

  const demande = etat.statut === 'pret' ? etat.donnees : null;

  // Notification temps réel : « Kévin a dit mi lé la. Arrivée prévue à 18 h. »
  useEffect(() => {
    if (!demande) return;
    const ids = new Set(extrasActifs(demande).map((e) => e.affectationId));
    if (connus.current) {
      const arrive = extrasActifs(demande).find((e) => !connus.current!.has(e.affectationId));
      if (arrive) setNouveau(notificationConfirmation(arrive.prenom, demande.debut));
    }
    connus.current = ids;
  }, [demande]);

  if (etat.statut === 'chargement') {
    return (
      <div className={p.etroite} aria-busy>
        <div className={p.squelette} />
      </div>
    );
  }
  if (!demande) {
    return (
      <div className={p.etroite}>
        <Link href="/espace" className={p.retour}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          {ts.retour}
        </Link>
        <p className={ui.sousTitre}>{etat.statut === 'erreur' ? t.extra.missions.horsLigneTitre : ts.introuvable}</p>
      </div>
    );
  }

  const d: DemandeSuivi = demande;
  const phase = phaseDemande(d);
  const actifs = extrasActifs(d);
  const restants = Math.max(d.nbExtras - actifs.length, 0);
  const minutes = dureeMinutes(d.debut, d.fin) ?? 0;
  const recap = recapDemande({
    minutes,
    tauxHoraireBrutCentimes: d.tauxHoraireBrutCentimes,
    nbExtras: d.nbExtras,
    fraisMiseEnRelationHTCentimes: d.fraisMiseEnRelationHTCentimes,
  });
  const premierASigner = actifs.find((e) => e.statut === 'confirmee' && !e.contratSigneRestaurant);
  const publieeA = formatHeure(minuteReunion(new Date(d.creeLe)));

  async function annuler() {
    setAnnulation('envoi');
    try {
      await source().annulerDemande(d.id);
    } finally {
      setAnnulation('ferme');
    }
  }

  return (
    <div className={p.etroite}>
      <Link href="/espace" className={p.retour}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        {ts.retour}
      </Link>

      <div className={p.intro}>
        <p className={`${ui.corps} ${ui.galet}`}>{dateLongue(d.jour)}</p>
        <p className={p.pilule}>{formatPlage(d.debut, d.fin)}</p>
        <h1 className={`${ui.sousTitre} ${s.titre}`}>
          {LIBELLES_POSTE[d.poste].court} · {d.nbExtras} extra{d.nbExtras > 1 ? 's' : ''}
        </h1>
      </div>

      {nouveau && (
        <div className={ui.bandeauVacoa} role="status">
          <Check size={20} strokeWidth={2.5} aria-hidden />
          {nouveau}
        </div>
      )}
      {phase === 'annulee' && <p className={ui.encadreErreur}>{ts.annulee}</p>}
      {phase === 'terminee' && <p className={`${ui.corpsFort} ${ui.galet}`}>{ts.terminee}</p>}

      {/* Extras trouvés et places restantes */}
      <section className={s.carte} aria-label={ts.trouve}>
        {actifs.map((e) => (
          <div key={e.affectationId} className={s.ligne}>
            <AvatarExtra extraId={e.extraId} prenom={e.prenom} nom={e.nom} alt={`${ts.photoDe} ${e.prenom}`} />
            <div className={s.contenu}>
              <span className={`${ui.corpsFort} ${s.nomExtra}`}>
                <Check size={18} strokeWidth={2.5} className={ui.vacoa} aria-hidden />
                {e.prenom} {e.nom}
              </span>
              {resumeProfil(e) && <span className={ui.legende}>{resumeProfil(e)}</span>}
              {e.presentation && <span className={`${ui.corps} ${s.presentation}`}>« {e.presentation} »</span>}
              <span className={ui.legende}>
                {e.contratSigneRestaurant && e.contratSigneExtra
                  ? ts.contratSigne
                  : e.contratSigneRestaurant
                    ? textesEcrans.resto.contrat.attenteExtra
                    : ts.contratASigner}
              </span>
              <div className={s.actions}>
                <ContactExtra prenom={e.prenom} telephone={e.telephone} />
                {phase === 'aNoter' && !e.notation && (
                  <Link href={`/demandes/${d.id}/notation?affectation=${e.affectationId}`} className={ui.lien}>
                    {ts.noter}
                  </Link>
                )}
                {!e.contratSigneRestaurant && e !== premierASigner && e.statut === 'confirmee' && (
                  <Link href={`/demandes/${d.id}/contrat?affectation=${e.affectationId}`} className={ui.lien}>
                    {ts.signerContrat}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
        {phase !== 'annulee' &&
          phase !== 'terminee' &&
          Array.from({ length: restants }, (_, i) => (
            <div key={`attente-${i}`} className={s.ligne}>
              <Clock size={20} strokeWidth={2} className={ui.galet} aria-hidden />
              <div className={s.contenu}>
                <span className={`${ui.corpsFort} ${s.recherche}`}>
                  {ts.recherche}
                  <Spinner taille={16} />
                </span>
                <span className={ui.legende}>
                  {ts.publiee} à {publieeA}. {ts.delai}
                </span>
              </div>
            </div>
          ))}
      </section>

      {premierASigner && (
        <Link
          href={`/demandes/${d.id}/contrat?affectation=${premierASigner.affectationId}`}
          className={ui.boutonPrincipal}
        >
          {ts.signerContrat} · {premierASigner.prenom}
        </Link>
      )}

      {/* Rappel de la demande */}
      <section className={s.carte}>
        <div className={s.ligne}>
          <MapPin size={20} strokeWidth={2} className={ui.galet} aria-hidden />
          <div className={s.contenu}>
            <span className={ui.corpsFort}>{d.adresse}</span>
            <span className={ui.corpsFort}>{[d.codePostal, d.commune].filter(Boolean).join(' ')}</span>
            {d.retourAssure && <span className={`${ui.legendeForte} ${ui.vacoa}`}>{ts.retourAssure}</span>}
          </div>
        </div>
        {d.consignes && (
          <div className={s.ligne}>
            <Shirt size={20} strokeWidth={2} className={ui.galet} aria-hidden />
            <p className={`${ui.corps} ${s.contenu}`}>{d.consignes}</p>
          </div>
        )}
        <div className={s.ligne}>
          <FileText size={20} strokeWidth={2} className={ui.galet} aria-hidden />
          <div className={s.contenu}>
            <div className={p.entreDeux}>
              <span className={ui.corps}>{t.resto.demande.salaires}</span>
              <span className={ui.corpsFort}>{formatEuros(recap.salairesBrutsCentimes)}</span>
            </div>
            <span className={ui.legende}>{legendeSalaires(d.nbExtras, minutes, d.tauxHoraireBrutCentimes)}</span>
            <div className={`${p.entreDeux} ${s.espace}`}>
              <span className={ui.corps}>{t.resto.demande.frais}</span>
              <span className={ui.corpsFort}>{formatHT(recap.fraisHTCentimes)}</span>
            </div>
            <span className={ui.legende}>{legendeFrais(d.nbExtras, d.fraisMiseEnRelationHTCentimes)}</span>
          </div>
        </div>
      </section>

      {(phase === 'recherche' || phase === 'pourvue') && (
        <section className={s.annulation}>
          {annulation === 'ferme' ? (
            <button type="button" className={ui.lienDiscret} onClick={() => setAnnulation('question')}>
              {ts.annuler}
            </button>
          ) : (
            <div className={s.carte} role="alertdialog" aria-labelledby="q-annuler" aria-describedby="i-annuler">
              <div className={s.contenuSeul}>
                <p id="q-annuler" className={ui.sousTitre}>
                  {ts.annulerQuestion}
                </p>
                <p id="i-annuler" className={`${ui.corps} ${ui.galet}`}>
                  {ts.annulerInfo}
                </p>
                <div className={s.actions}>
                  <button type="button" className={ui.boutonSecondaire} onClick={annuler} disabled={annulation === 'envoi'}>
                    {annulation === 'envoi' && <Spinner taille={16} />}
                    {ts.annulerConfirmer}
                  </button>
                  <button type="button" className={ui.lien} onClick={() => setAnnulation('ferme')}>
                    {ts.garder}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
