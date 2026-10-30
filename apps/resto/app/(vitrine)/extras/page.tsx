import type { Metadata } from 'next';
import { DEFINITION_SECTEURS, LIBELLES_POSTE, LIBELLES_ZONE, montantsVitrine, SECTEURS, textesVitrine, ZONES, type Poste } from '@kivien/core';
import { LogoKivien } from '@/components/vitrine/LogoKivien';
import { VignettePoste } from '@/components/VignettePoste';
import { LIENS_VITRINE } from '@/lib/vitrine/liens';
import { parametresPublics } from '@/lib/vitrine/parametres';
import v from '../vitrine.module.css';
import s from './extras.module.css';

export const revalidate = 3600;

const t = textesVitrine.extras;

export const metadata: Metadata = {
  title: t.titreOnglet,
  description: t.texte,
  openGraph: { title: `Kivien · ${t.titre}`, description: t.texte, images: ['/vitrine/salle.jpg'] },
};

/** Métiers proposés aux extras, sans doublon, dans l'ordre des secteurs. */
const METIERS: Poste[] = [...new Set(SECTEURS.flatMap((x) => DEFINITION_SECTEURS[x].postes))];

/** Page de recrutement des extras (lien des annonces) : inscription dans l'app. */
export default async function DevenirExtra() {
  const p = await parametresPublics();
  const m = montantsVitrine(p.tauxHoraireBrutCentimes, p.fraisMiseEnRelationHTCentimes);
  const inscription = LIENS_VITRINE.telechargerApp;

  return (
    <div className={v.page}>
      <section className={s.haut}>
        <header className={s.entete}>
          <a href="/" aria-label="Kivien, accueil">
            <LogoKivien largeur={88} encre="#FBF6EE" pilule="#C2401E" />
          </a>
          <a href={LIENS_VITRINE.seConnecter} className={s.lienPro}>
            {textesVitrine.nav.trouver}
          </a>
        </header>
        <div className={s.heros}>
          <div className={s.texteHaut}>
            <span className={s.surtitre}>{t.surtitre}</span>
            <h1 className={s.titre}>{t.titre}</h1>
            <p className={s.texte}>{t.texte}</p>
            <a href={inscription} className={v.boutonPiment}>
              {t.bouton}
            </a>
            <span className={s.legende}>{t.sousBouton}</span>
            <p className={s.lancement}>{t.lancement}</p>
          </div>
          <img src="/vitrine/salle.jpg" alt="" className={s.photo} />
        </div>
      </section>

      <section className={s.bloc} aria-labelledby="gain">
        <div className={s.carteGain}>
          <h2 id="gain" className={s.sousTitre}>
            {t.gainTitre}
          </h2>
          <p className={s.gain}>{t.gainTexte(m.net, m.brut)}</p>
          <p className={s.note}>{t.gainNote}</p>
        </div>
      </section>

      <section className={s.bloc} aria-labelledby="metiers">
        <h2 id="metiers" className={s.sousTitre}>
          {t.metiersTitre}
        </h2>
        <p className={s.note}>{t.metiersTexte}</p>
        <ul className={s.metiers}>
          {METIERS.map((poste) => (
            <li key={poste} className={s.metier}>
              <VignettePoste poste={poste} taille={40} />
              {LIBELLES_POSTE[poste].mission}
            </li>
          ))}
        </ul>
      </section>

      <section className={s.bloc} aria-labelledby="etapes">
        <h2 id="etapes" className={s.sousTitre}>
          {t.etapesTitre}
        </h2>
        <ol className={s.etapes}>
          {t.etapes.map((e) => (
            <li key={e.n} className={s.etape}>
              <span className={s.numero}>{e.n}</span>
              <strong>{e.titre}</strong>
              <span className={s.note}>{e.texte}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.bloc} aria-labelledby="zones">
        <h2 id="zones" className={s.sousTitre}>
          {t.zonesTitre}
        </h2>
        <div className={s.zones}>
          {ZONES.map((z) => (
            <span key={z} className={s.zone}>
              {LIBELLES_ZONE[z]}
            </span>
          ))}
        </div>
        <p className={s.note}>{t.zonesTexte}</p>
      </section>

      <section className={s.fin}>
        <h2 className={s.titreFin}>{t.finTitre}</h2>
        <a href={inscription} className={v.boutonPiment}>
          {t.bouton}
        </a>
        <span className={s.legende}>{t.sousBouton}</span>
      </section>
    </div>
  );
}
