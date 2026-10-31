import type { Metadata } from 'next';
import { aPropos } from '@kivien/core';
import { PageTexte } from '@/components/vitrine/PageTexte';
import s from '../vitrine.module.css';

export const metadata: Metadata = { title: aPropos.titre };

/** Qui sommes-nous : l'histoire et les engagements de Kivien. */
export default function QuiSommesNous() {
  return (
    <PageTexte
      page={{
        titre: aPropos.titre,
        intro: aPropos.intro,
        miseAJour: '',
        sections: aPropos.sections,
      }}
      apres={
        <section className={s.sectionTexte}>
          <p className={s.paragraphe}>{aPropos.contact}</p>
          <p className={`${s.paragraphe} ${s.corpsFort}`}>{aPropos.signature}</p>
        </section>
      }
    />
  );
}
