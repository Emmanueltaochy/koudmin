import { textesVitrine as t } from '@kivien/core';
import { LIENS_VITRINE } from '@/lib/vitrine/liens';
import s from '@/app/(vitrine)/vitrine.module.css';
import { LogoKivien } from './LogoKivien';

/** Pied de page commun des pages publiques. */
export function PiedVitrine() {
  return (
    <footer className={s.pied}>
      <div className={s.piedColonnes}>
        <div className={s.gap8}>
          <LogoKivien largeur={88} encre="#FBF6EE" pilule="#FBF6EE" />
          <span className={s.texte}>{t.pied.signature}</span>
        </div>
        {t.pied.colonnes.map((c) => (
          <div key={c.titre} className={s.gap8}>
            <span className={s.corpsFort}>{c.titre}</span>
            {c.liens.map((l) => (
              <a key={l} href={LIENS_VITRINE.pied[l] ?? '#'} className={s.lienPied}>
                {l}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className={s.piedBas}>
        <span>{t.pied.copyright}</span>
        <div className={s.piedLegal}>
          {t.pied.legal.map((l) => (
            <a key={l} href={LIENS_VITRINE.pied[l] ?? '#'}>
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
