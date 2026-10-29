'use client';

import { useState } from 'react';
import { textesVitrine } from '@kivien/core';
import s from './vitrine.module.css';

const t = textesVitrine.temoignages;

function Fleche({ sens }: { sens: 'gauche' | 'droite' }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {sens === 'gauche' ? (
        <>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </>
      ) : (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      )}
    </svg>
  );
}

/** Cartes empilées : la carte du dessus, les suivantes décalées et inclinées derrière. */
export function Temoignages({ photos }: { photos: string[] }) {
  const [q, setQ] = useState(0);
  const n = t.liste.length;
  const actif = ((q % n) + n) % n;

  return (
    <div className={s.carrousel}>
      <button type="button" className={s.fleche} aria-label={t.precedent} onClick={() => setQ((v) => v - 1)}>
        <Fleche sens="gauche" />
      </button>
      <div className={s.pileCartes} aria-live="polite">
        {t.liste.map((c, i) => {
          const d = (i - actif + n) % n;
          return (
            <div
              key={c.prenom}
              className={s.carteTemoignage}
              aria-hidden={d !== 0}
              style={{
                zIndex: n - d,
                opacity: d > 3 ? 0 : 1,
                transform:
                  d === 0 ? 'none' : `translateX(${d * 36}px) translateY(${d * 10}px) rotate(${d * 2.5}deg) scale(${1 - d * 0.04})`,
              }}
            >
              <div className={s.carteTemoignageCorps}>
                <div className={s.photoTemoignage}>
                  <img src={photos[i]} alt={c.photo} loading="lazy" />
                </div>
                <div className={s.citation}>
                  <span className={s.citationPrenom}>{c.prenom}</span>
                  <p className={s.citationTexte}>« {c.texte} »</p>
                </div>
              </div>
              <div className={s.carteTemoignagePied}>
                <div className={s.avatar}>
                  <img src={photos[i]} alt="" />
                </div>
                <div className={s.auteur}>
                  <span className={s.corpsFort}>{c.nom}</span>
                  <span className={`${s.legende} ${s.galet}`}>{c.role}</span>
                </div>
                <span className={`${s.legendeForte} ${s.galet}`}>
                  {i + 1} / {n}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className={s.fleche} aria-label={t.suivant} onClick={() => setQ((v) => v + 1)}>
        <Fleche sens="droite" />
      </button>
    </div>
  );
}
