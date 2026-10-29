'use client';

import { useEffect, useState } from 'react';
import { initiales } from '@kivien/core';
import { source } from '@/lib/donnees';
import s from './AvatarExtra.module.css';

/** Photo de l'extra (chargée à l'affichage), ou ses initiales sans photo. */
export function AvatarExtra({ extraId, prenom, nom, alt, taille = 56 }: { extraId: string; prenom: string; nom: string; alt: string; taille?: number }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    source()
      .photoExtra(extraId)
      .then((p) => actif && setPhoto(p))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [extraId]);

  const dimensions = { width: taille, height: taille };
  return photo ? (
    <img src={`data:image/jpeg;base64,${photo}`} alt={alt} className={s.photo} style={dimensions} />
  ) : (
    <span role="img" aria-label={alt} className={s.initiales} style={dimensions}>
      {initiales(prenom, nom)}
    </span>
  );
}
