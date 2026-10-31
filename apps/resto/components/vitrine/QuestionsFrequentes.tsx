import { questionsFrequentes as q } from '@kivien/core';
import s from '@/app/(vitrine)/vitrine.module.css';

/** Questions fréquentes, en accordéon (sans JavaScript : details / summary). */
export function QuestionsFrequentes({ titreNiveau = 2 }: { titreNiveau?: 1 | 2 }) {
  const Titre = titreNiveau === 1 ? 'h1' : 'h2';
  return (
    <section id="questions" className={s.questions} aria-labelledby="titre-questions">
      <div className={s.intro}>
        <span className={`${s.surtitre} ${s.galet}`}>{q.surtitre}</span>
        <Titre id="titre-questions" className={s.titreSection}>
          {q.titre}
        </Titre>
      </div>
      <div className={s.listeQuestions}>
        {q.questions.map((x) => (
          <details key={x.question} className={s.question}>
            <summary>{x.question}</summary>
            <p className={s.paragraphe}>{x.reponse}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
