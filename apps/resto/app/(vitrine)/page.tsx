import type { Metadata } from 'next';
import { textesVitrine as t } from '@kivien/core';
import { BandeauLancement, EnteteVitrine } from '@/components/vitrine/EnteteVitrine';
import { PhotosDefilantes } from '@/components/vitrine/Photos';
import { PiedVitrine } from '@/components/vitrine/PiedVitrine';
import { QuestionsFrequentes } from '@/components/vitrine/QuestionsFrequentes';
import { LIENS_VITRINE } from '@/lib/vitrine/liens';
import { Lettre } from './Lettre';
import s from './vitrine.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Kivien · Les extras péi, près de chez vous.' },
};

const a = t.accueil;

/** Deux entrées : l'établissement qui recrute, l'extra qui cherche des missions. */
function Choix({ variante }: { variante: 'sombre' | 'clair' }) {
  return (
    <div className={s.choix} data-variante={variante}>
      <a href="/pro" className={s.carteChoix} data-cote="pro">
        <span className={s.choixTitre}>{a.pro.titre}</span>
        <span className={s.choixTexte}>{a.pro.texte}</span>
        <span className={s.boutonPiment}>{a.pro.bouton}</span>
      </a>
      <a href="/extras" className={s.carteChoix} data-cote="extra">
        <span className={s.choixTitre}>{a.extra.titre}</span>
        <span className={s.choixTexte}>{a.extra.texte}</span>
        <span className={s.boutonClair}>{a.extra.bouton}</span>
      </a>
    </div>
  );
}

/** Accueil : le concept de Kivien, pour les établissements comme pour les extras. */
export default function Accueil() {
  return (
    <div className={s.page}>
      <BandeauLancement />
      <div className={s.pile}>
        <section className={s.promesse} aria-label="Kivien">
          <EnteteVitrine />
          <div className={s.heros}>
            <div className={s.gap32}>
              <div className={s.gap16}>
                <div className={s.surtitreHeros}>{a.surtitre}</div>
                <h1 className={s.titreHeros}>{a.titre}</h1>
                <p className={s.texteHeros}>{a.texte}</p>
              </div>
              <Choix variante="sombre" />
            </div>
            <div className={s.gap8}>
              <PhotosDefilantes />
              <div className={s.confirme}>
                <span className={s.confirmeHeure}>{t.promesse.confirmationHeure}</span>
                <span className={s.confirmeTexte}>{t.promesse.confirmation}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="etapes" className={s.etapes}>
          <div className={s.intro}>
            <span className={s.surtitre}>{a.commentSurtitre}</span>
            <h2 className={s.titreFort}>{a.commentTitre}</h2>
          </div>
          <div className={s.deuxCotes}>
            {[
              { cote: a.cotePro, lien: '/pro' },
              { cote: a.coteExtra, lien: '/extras' },
            ].map(({ cote, lien }) => (
              <div key={cote.titre} className={s.carteCote}>
                <h3 className={s.carteTitre}>{cote.titre}</h3>
                <ol className={s.etapesCote}>
                  {cote.etapes.map((e, i) => (
                    <li key={e}>
                      <span className={s.numero}>{i + 1}</span>
                      <span className={s.texte}>{e}</span>
                    </li>
                  ))}
                </ol>
                <a href={lien} className={s.lienInscription}>
                  {cote.lien}
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className={s.garanties} aria-labelledby="pourquoi">
          <div className={s.intro}>
            <span className={`${s.surtitre} ${s.galet}`}>{a.valeursSurtitre}</span>
            <h2 id="pourquoi" className={s.titreSection}>
              {a.valeursTitre}
            </h2>
          </div>
          <div className={s.grilleGaranties}>
            {a.valeurs.map((v, i) => (
              <div key={v.titre} className={s.carteGarantie} data-variante={i}>
                <span className={s.argumentTitre}>{v.titre}</span>
                <span className={s.texte}>{v.texte}</span>
              </div>
            ))}
          </div>
        </section>

        <QuestionsFrequentes />

        <section className={`${s.etapes} ${s.finChoix}`} aria-labelledby="commencer">
          <div className={s.introCentree}>
            <h2 id="commencer" className={s.titreFort}>
              {a.finTitre}
            </h2>
          </div>
          <Choix variante="clair" />
          <a href={LIENS_VITRINE.seConnecter} className={s.lienInscription}>
            {t.nav.seConnecter}
          </a>
        </section>

        <section className={s.lettre} aria-label={t.lettre.titre}>
          <div className={s.lettreIntro}>
            <span className={s.lettreTitre}>{t.lettre.titre}</span>
            <span className={`${s.texte} ${s.galet}`}>{t.lettre.texte}</span>
          </div>
          <Lettre />
        </section>

        <PiedVitrine />
      </div>
    </div>
  );
}
