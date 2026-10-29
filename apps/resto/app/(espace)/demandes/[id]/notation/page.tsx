'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { dateLongue, formatPlage, LIBELLES_POSTE, textes as t, textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source } from '@/lib/donnees';
import { useDonnees } from '@/lib/useDonnees';
import s from './notation.module.css';

const tn = textesEcrans.resto.notation;

function Notation() {
  const { id } = useParams<{ id: string }>();
  const affectationId = useSearchParams().get('affectation');
  const router = useRouter();
  const { etat } = useDonnees((src) => src.demande(id), [id]);
  const [present, setPresent] = useState<boolean | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const [favori, setFavori] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<{ presence?: string; note?: string; envoi?: string }>({});

  if (etat.statut !== 'pret') return <div className={p.etroite} aria-busy><div className={p.squelette} /></div>;
  const d = etat.donnees;
  const extra = d?.extras.find((e) => e.affectationId === affectationId);
  if (!d || !extra) return <div className={p.etroite}><p className={ui.sousTitre}>{textesEcrans.resto.suivi.introuvable}</p></div>;

  async function enregistrer() {
    const e = {
      presence: present === null ? tn.erreurPresence : undefined,
      note: present && note === null ? tn.erreurNote : undefined,
    };
    setErreurs(e);
    if (e.presence || e.note) return;
    setEnvoi(true);
    try {
      await source().noter(extra!.affectationId, {
        present: present!,
        note: present ? note : null,
        favori: present! && favori,
        commentaire: commentaire.trim() || null,
      });
      router.push(`/demandes/${d!.id}`);
    } catch {
      setErreurs({ envoi: "La note n'est pas partie. Vérifiez la connexion et réessayez." });
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
        <h1 className={ui.titre}>{tn.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>
          {LIBELLES_POSTE[d.poste].court} · {dateLongue(d.jour)} · {formatPlage(d.debut, d.fin)}
        </p>
      </div>

      <fieldset className={s.bloc} disabled={envoi}>
        <legend className={ui.corpsFort}>
          {extra.prenom} {tn.present}
        </legend>
        <div className={s.choix} role="radiogroup">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={present === v}
              className={s.chip}
              onClick={() => setPresent(v)}
            >
              {present === v && <Check size={16} strokeWidth={2.5} aria-hidden />}
              {v ? tn.oui : tn.non}
            </button>
          ))}
        </div>
        {erreurs.presence && <p className={ui.messageErreur}>{erreurs.presence}</p>}
        {present === false && <p className={`${ui.legendeForte} ${ui.braise}`}>{tn.absentInfo}</p>}
      </fieldset>

      {present && (
        <>
          <fieldset className={s.bloc} disabled={envoi}>
            <legend className={ui.corpsFort}>{tn.note}</legend>
            <div className={s.choix} role="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={note === n}
                  aria-label={`${n} sur 5`}
                  className={`${s.chip} ${s.chiffre}`}
                  onClick={() => setNote(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className={erreurs.note ? ui.messageErreur : ui.legende}>{erreurs.note ?? tn.noteAide}</p>
          </fieldset>

          <label className={s.case}>
            <input type="checkbox" checked={favori} onChange={(e) => setFavori(e.target.checked)} disabled={envoi} />
            <span className={s.textes}>
              <span className={ui.corps}>{tn.favori}</span>
              <span className={ui.legende}>{tn.favoriAide}</span>
            </span>
          </label>
        </>
      )}

      <div className={s.bloc}>
        <div className={p.entreDeux}>
          <label htmlFor="commentaire" className={ui.corpsFort}>
            {tn.commentaire}
          </label>
          <span className={ui.legende}>{t.resto.demande.facultatif}</span>
        </div>
        <textarea
          id="commentaire"
          className={s.zone}
          value={commentaire}
          maxLength={500}
          onChange={(e) => setCommentaire(e.target.value)}
          disabled={envoi}
        />
      </div>

      {erreurs.envoi && <p className={ui.encadreErreur}>{erreurs.envoi}</p>}
      <button type="button" className={ui.boutonPrincipal} onClick={enregistrer} aria-busy={envoi} disabled={envoi}>
        {envoi && <Spinner />}
        {tn.enregistrer}
      </button>
    </div>
  );
}

export default function PageNotation() {
  return (
    <Suspense>
      <Notation />
    </Suspense>
  );
}
