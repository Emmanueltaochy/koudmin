'use client';

import { DEFINITION_SECTEURS, SECTEURS, type Secteur } from '@kivien/core';
import ui from './ui.module.css';

/** Liste des secteurs où le contrat d'extra est permis, avec un exemple d'établissement. */
export function ChoixSecteur({
  id,
  valeur,
  erreur,
  aide,
  desactive,
  onChange,
}: {
  id: string;
  valeur: Secteur | '';
  erreur?: string;
  aide?: string;
  desactive?: boolean;
  onChange: (s: Secteur) => void;
}) {
  return (
    <>
      <span className={ui.champ} data-erreur={!!erreur}>
        <select
          id={id}
          value={valeur}
          onChange={(e) => onChange(e.target.value as Secteur)}
          aria-invalid={!!erreur}
          aria-describedby={`${id}-aide`}
          disabled={desactive}
        >
          <option value="" disabled>
            Choisir
          </option>
          {SECTEURS.map((s) => (
            <option key={s} value={s}>
              {DEFINITION_SECTEURS[s].libelle} ({DEFINITION_SECTEURS[s].exemples.toLowerCase()})
            </option>
          ))}
        </select>
      </span>
      {(erreur || aide) && (
        <p id={`${id}-aide`} className={erreur ? ui.messageErreur : ui.legende} role={erreur ? 'alert' : undefined}>
          {erreur ?? aide}
        </p>
      )}
    </>
  );
}
