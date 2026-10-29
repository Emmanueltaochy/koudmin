'use client';

import { normaliserHeure } from '@koudmin/core';

/** Heure au format 24 h (« 18:00 »), identique quelle que soit la langue du navigateur. */
export function ChampHeure({
  id,
  valeur,
  onChange,
  invalide,
  libelle,
}: {
  id?: string;
  valeur: string;
  onChange: (v: string) => void;
  invalide?: boolean;
  libelle: string;
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="18:00"
      maxLength={5}
      aria-label={libelle}
      aria-invalid={invalide}
      value={valeur}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d:h]/gi, '');
        // « 18 » puis un chiffre : on insère les deux-points.
        onChange(/^\d{3,4}$/.test(v) && !v.includes(':') ? `${v.slice(0, 2)}:${v.slice(2)}` : v);
      }}
      onBlur={() => onChange(normaliserHeure(valeur))}
    />
  );
}
