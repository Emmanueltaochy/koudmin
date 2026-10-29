'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { suggererAdresses, type AdresseGeo } from '@/lib/adresse';
import ui from './ui.module.css';
import s from './ChampAdresse.module.css';

/**
 * Champ adresse avec propositions (base adresse nationale, La Réunion uniquement).
 * Taper sans choisir reste possible : l'adresse est alors géocodée à l'envoi.
 */
export function ChampAdresse({
  id,
  valeur,
  erreur,
  desactive,
  onSaisie,
  onChoix,
}: {
  id: string;
  valeur: string;
  erreur?: string;
  desactive?: boolean;
  onSaisie: (texte: string) => void;
  onChoix: (a: AdresseGeo) => void;
}) {
  const [propositions, setPropositions] = useState<AdresseGeo[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [active, setActive] = useState(-1);
  const liste = useId();
  const derniere = useRef('');
  const zone = useRef<HTMLTextAreaElement>(null);
  const idErreur = `${id}-erreur`;

  // L'adresse passe à la ligne au lieu d'être tronquée (hauteur ajustée au contenu).
  useLayoutEffect(() => {
    const z = zone.current;
    if (!z) return;
    z.style.height = 'auto';
    z.style.height = `${z.scrollHeight}px`;
  }, [valeur]);

  useEffect(() => {
    if (!ouvert || valeur.trim().length < 3 || valeur === derniere.current) return;
    const ctrl = new AbortController();
    const minuterie = setTimeout(() => {
      suggererAdresses(valeur, ctrl.signal)
        .then((p) => {
          setPropositions(p);
          setActive(-1);
        })
        .catch(() => setPropositions([]));
    }, 250);
    return () => {
      clearTimeout(minuterie);
      ctrl.abort();
    };
  }, [valeur, ouvert]);

  function choisir(a: AdresseGeo) {
    derniere.current = a.libelle;
    onChoix(a);
    setPropositions([]);
    setOuvert(false);
  }

  const visibles = ouvert && propositions.length > 0;

  return (
    <div className={s.conteneur}>
      <div className={`${ui.champ} ${s.champ}`} data-erreur={!!erreur}>
        <MapPin size={20} strokeWidth={2} className={`${ui.icone} ${ui.galet}`} aria-hidden />
        <textarea
          ref={zone}
          id={id}
          rows={1}
          role="combobox"
          aria-expanded={visibles}
          aria-controls={liste}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${liste}-${active}` : undefined}
          aria-invalid={!!erreur}
          aria-describedby={erreur ? idErreur : undefined}
          autoComplete="street-address"
          placeholder="Numéro, rue, commune"
          value={valeur}
          disabled={desactive}
          onChange={(e) => {
            onSaisie(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onKeyDown={(e) => {
            // Pas de retour à la ligne dans une adresse : Entrée choisit une proposition ou envoie.
            if (e.key === 'Enter' && !(visibles && active >= 0)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
              return;
            }
            if (!visibles) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, propositions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault();
              choisir(propositions[active]!);
            } else if (e.key === 'Escape') {
              setOuvert(false);
            }
          }}
        />
      </div>
      {visibles && (
        <ul id={liste} role="listbox" className={s.liste}>
          {propositions.map((p, i) => (
            <li
              key={`${p.libelle}-${i}`}
              id={`${liste}-${i}`}
              role="option"
              aria-selected={i === active}
              className={s.option}
              onMouseDown={(e) => {
                e.preventDefault();
                choisir(p);
              }}
            >
              {p.libelle}
            </li>
          ))}
        </ul>
      )}
      {erreur && (
        <p id={idErreur} className={ui.messageErreur}>
          {erreur}
        </p>
      )}
    </div>
  );
}
