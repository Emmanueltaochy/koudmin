import type { PageLegale } from '@kivien/core';
import s from '@/app/(vitrine)/vitrine.module.css';
import { BandeauLancement, EnteteVitrine } from './EnteteVitrine';
import { PiedVitrine } from './PiedVitrine';

/** Page de texte (mentions légales, conditions, confidentialité, qui sommes-nous…). */
export function PageTexte({ page, apres }: { page: PageLegale; apres?: React.ReactNode }) {
  return (
    <div className={s.page}>
      <BandeauLancement />
      <div className={s.pile}>
        <section className={s.promesse} aria-label="Kivien">
          <EnteteVitrine />
          <div className={s.enteteTexte}>
            <h1 className={s.titreTexte}>{page.titre}</h1>
            <p className={s.texteHeros}>{page.intro}</p>
          </div>
        </section>
        <main className={s.corpsTexte}>
          {page.sections.map((section) => (
            <section
              key={section.titre}
              id={section.titre.split('.')[0]}
              className={s.sectionTexte}
            >
              <h2 className={s.titreSectionTexte}>{section.titre}</h2>
              {section.paragraphes.map((p) => (
                <p key={p} className={s.paragraphe}>
                  {p}
                </p>
              ))}
            </section>
          ))}
          {apres}
          {page.miseAJour && <p className={`${s.legende} ${s.galet}`}>{page.miseAJour}</p>}
        </main>
        <PiedVitrine />
      </div>
    </div>
  );
}
