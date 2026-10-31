import type { Metadata } from 'next';
import { questionsFrequentes } from '@kivien/core';
import { BandeauLancement, EnteteVitrine } from '@/components/vitrine/EnteteVitrine';
import { PiedVitrine } from '@/components/vitrine/PiedVitrine';
import { QuestionsFrequentes } from '@/components/vitrine/QuestionsFrequentes';
import s from '../vitrine.module.css';

export const metadata: Metadata = { title: 'Questions fréquentes', description: questionsFrequentes.questions.map((q) => q.question).join(' ') };

export default function PageQuestions() {
  return (
    <div className={s.page}>
      <BandeauLancement />
      <div className={s.pile}>
        <section className={s.promesse} aria-label="Kivien">
          <EnteteVitrine />
        </section>
        <QuestionsFrequentes titreNiveau={1} />
        <PiedVitrine />
      </div>
    </div>
  );
}
