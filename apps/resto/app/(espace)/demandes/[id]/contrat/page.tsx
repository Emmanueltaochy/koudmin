'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronLeft } from 'lucide-react';
import { formatHeure, redigerContrat, textesEcrans } from '@koudmin/core';
import { PaveSignature, type PaveSignatureRef } from '@/components/PaveSignature';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source } from '@/lib/donnees';
import { useDonnees } from '@/lib/useDonnees';
import s from './contrat.module.css';

const tc = textesEcrans.resto.contrat;
/** Portail officiel de la déclaration préalable à l'embauche. */
const URL_DPAE = 'https://www.net-entreprises.fr/declaration/dpae/';

function Contrat() {
  const { id } = useParams<{ id: string }>();
  const affectationId = useSearchParams().get('affectation');
  const { etat } = useDonnees(async (src) => {
    const [demande, restaurant] = await Promise.all([src.demande(id), src.restaurant()]);
    return { demande, restaurant };
  }, [id]);
  const pave = useRef<PaveSignatureRef>(null);
  const [lu, setLu] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<{ signature?: string; lecture?: string; envoi?: string }>({});

  if (etat.statut !== 'pret') return <div className={p.etroite} aria-busy><div className={p.squelette} /></div>;
  const { demande: d, restaurant } = etat.donnees;
  const extra = d?.extras.find((e) => e.affectationId === affectationId);
  if (!d || !extra) {
    return (
      <div className={p.etroite}>
        <Link href={d ? `/demandes/${d.id}` : '/'} className={p.retour}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          {textesEcrans.resto.suivi.retour}
        </Link>
        <p className={ui.sousTitre}>{textesEcrans.resto.suivi.introuvable}</p>
      </div>
    );
  }

  const contrat = redigerContrat({
    employeur: {
      nom: restaurant.nom,
      adresse: restaurant.adresse?.libelle ?? `${d.adresse}, ${d.codePostal ?? ''} ${d.commune}`,
      siret: null,
    },
    salarie: { prenom: extra.prenom, nom: extra.nom, dateNaissance: null, lieuNaissance: null, adresse: null },
    poste: d.poste,
    jour: d.jour,
    debut: d.debut,
    fin: d.fin,
    tauxHoraireBrutCentimes: d.tauxHoraireBrutCentimes,
    adresseService: `${d.adresse}, ${[d.codePostal, d.commune].filter(Boolean).join(' ')}`,
  });

  async function signer() {
    const image = pave.current?.image() ?? null;
    const e = { signature: image ? undefined : tc.erreurSignature, lecture: lu ? undefined : tc.erreurLecture };
    setErreurs(e);
    if (e.signature || e.lecture || !image) return;
    setEnvoi(true);
    try {
      await source().signerContrat(extra!.affectationId, image);
    } catch {
      setErreurs({ envoi: "La signature n'est pas partie. Vérifiez la connexion et réessayez." });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={p.etroite}>
      <Link href={`/demandes/${d.id}`} className={p.retour}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        {textesEcrans.resto.suivi.retour}
      </Link>
      <div className={p.intro}>
        <h1 className={ui.titre}>{tc.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{tc.sousTitre}</p>
      </div>

      <article className={s.contrat} aria-label={contrat.titre}>
        <h2 className={ui.corpsFort}>{contrat.titre}</h2>
        {contrat.articles.map((a, i) => (
          <section key={a.titre} className={s.article}>
            <h3 className={ui.legendeForte}>
              {i + 1}. {a.titre}
            </h3>
            <p className={ui.corps}>{a.texte}</p>
          </section>
        ))}
      </article>

      {extra.contratSigneRestaurant ? (
        <>
          <div className={ui.bandeauVacoa} role="status">
            <Check size={20} strokeWidth={2.5} aria-hidden />
            {extra.contratSigneExtra ? tc.signeParLesDeux : `${tc.signe} ${tc.attenteExtra}`}
          </div>
          <section className={s.dpae} aria-labelledby="dpae">
            <h2 id="dpae" className={ui.sousTitre}>
              {tc.dpaeTitre}
            </h2>
            <p className={ui.corps}>{tc.dpaeTexte}</p>
            <a href={URL_DPAE} target="_blank" rel="noopener noreferrer" className={ui.boutonPrincipal}>
              {tc.dpaeLien}
              <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
            </a>
            <InfosDPAEListe affectationId={extra.affectationId} jour={d.jour} debut={d.debut} />
          </section>
        </>
      ) : (
        <section className={s.signature} aria-labelledby="signature">
          <div className={p.entreDeux}>
            <h2 id="signature" className={ui.corpsFort}>
              {tc.signature}
            </h2>
            <button type="button" className={ui.lien} onClick={() => pave.current?.effacer()}>
              {tc.effacer}
            </button>
          </div>
          <PaveSignature ref={pave} libelle={tc.signatureAide} erreur={!!erreurs.signature} />
          <p className={erreurs.signature ? ui.messageErreur : ui.legende}>{erreurs.signature ?? tc.signatureAide}</p>
          <label className={s.case}>
            <input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} />
            <span className={ui.corps}>{tc.lu}</span>
          </label>
          {erreurs.lecture && <p className={ui.messageErreur}>{erreurs.lecture}</p>}
          {erreurs.envoi && <p className={ui.encadreErreur}>{erreurs.envoi}</p>}
          <button type="button" className={ui.boutonPrincipal} onClick={signer} aria-busy={envoi} disabled={envoi}>
            {envoi ? (
              <>
                <Spinner />
                {tc.envoi}
              </>
            ) : (
              tc.signer
            )}
          </button>
        </section>
      )}
    </div>
  );
}

/** Ce que le restaurateur reporte sur net-entreprises.fr. */
function InfosDPAEListe({ affectationId, jour, debut }: { affectationId: string; jour: string; debut: number }) {
  const { etat } = useDonnees((src) => src.infosDPAE(affectationId), [affectationId]);
  if (etat.statut !== 'pret' || !etat.donnees) return null;
  const i = etat.donnees;
  const lignes: [string, string | null][] = [
    ['Salarié·e', `${i.prenom} ${i.nom}`],
    ['Date de naissance', i.dateNaissance ? i.dateNaissance.split('-').reverse().join('/') : null],
    ['Lieu de naissance', i.lieuNaissance],
    ['Numéro de sécurité sociale', i.nir],
    ['Adresse', i.adresse],
    ["Date et heure d'embauche", `${jour.split('-').reverse().join('/')} à ${formatHeure(debut)}`],
    ['Contrat', "CDD d'usage, une journée"],
  ];
  return (
    <div className={s.infos}>
      <h3 className={ui.corpsFort}>{tc.dpaeInfos}</h3>
      <dl className={s.liste}>
        {lignes.map(([cle, valeur]) => (
          <div key={cle} className={s.paire}>
            <dt className={ui.legende}>{cle}</dt>
            <dd className={ui.corpsFort}>{valeur ?? 'À demander à l’extra'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function PageContrat() {
  return (
    <Suspense>
      <Contrat />
    </Suspense>
  );
}
