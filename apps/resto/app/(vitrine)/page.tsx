import type { Metadata } from 'next';
import { montantsVitrine, textesVitrine as t } from '@kivien/core';
import { LogoKivien } from '@/components/vitrine/LogoKivien';
import { LIENS_VITRINE, PARTENAIRES, PHOTOS_HAUT, PHOTOS_TEMOIGNAGES } from '@/lib/vitrine/liens';
import { parametresPublics } from '@/lib/vitrine/parametres';
import { Lettre } from './Lettre';
import { Temoignages } from './Temoignages';
import s from './vitrine.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: 'Kivien · Les extras péi, en 2 heures.' },
};

const CREME = '#FBF6EE';
const PIMENT = '#C2401E';
const BASALTE = '#211C18';

function Coche() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2C7350" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={s.coche} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ColonnePhotos({ photos, sens }: { photos: typeof PHOTOS_HAUT.monte; sens: 'monte' | 'descend' }) {
  // Deux fois la même série : le défilement boucle sans saut.
  return (
    <div className={`${s.colonne} ${sens === 'monte' ? s.monte : s.descend}`}>
      {[...photos, ...photos].map((p, i) => (
        <div key={i} className={s.photo} style={{ height: p.hauteur }}>
          <img src={p.src} alt={i < photos.length ? p.alt : ''} aria-hidden={i >= photos.length || undefined} loading={i < 2 ? 'eager' : 'lazy'} />
        </div>
      ))}
    </div>
  );
}

export default async function Accueil() {
  const p = await parametresPublics();
  const m = montantsVitrine(p.tauxHoraireBrutCentimes, p.fraisMiseEnRelationHTCentimes);
  const partenaires = PARTENAIRES.length ? PARTENAIRES : Array.from({ length: 5 }, () => null);

  return (
    <div className={s.page}>
      <div className={s.pile}>
        <section className={s.promesse} aria-label="Kivien">
          <header className={s.entete}>
            <LogoKivien largeur={88} encre={CREME} pilule={PIMENT} />
            <nav className={s.nav} aria-label="Navigation">
              <a href="#etapes">{t.nav.trouver}</a>
              <a href="#app">{t.nav.devenir}</a>
              <a href="#garanties">{t.nav.garanties}</a>
              <a href="#tarif">{t.nav.tarif}</a>
            </nav>
            <div className={s.compte}>
              <a href={LIENS_VITRINE.seConnecter} className={s.lienConnexion}>
                {t.nav.seConnecter}
              </a>
              <a href={LIENS_VITRINE.creerCompte} className={s.connexion}>
                {t.nav.creerCompte}
              </a>
            </div>
          </header>
          <div className={s.heros}>
            <div className={s.gap32}>
              <div className={s.gap16}>
                <div className={s.surtitreHeros}>{t.promesse.surtitre}</div>
                <h1 className={s.titreHeros}>{t.promesse.titre}</h1>
                <p className={s.texteHeros}>{t.promesse.texte}</p>
              </div>
              <div className={s.appel}>
                <a href={LIENS_VITRINE.trouverExtra} className={s.boutonPiment}>
                  {t.promesse.bouton}
                </a>
                <span className={s.legende}>{t.promesse.sousBouton}</span>
              </div>
              <div className={s.chiffres}>
                <div className={s.chiffre}>
                  <span className={s.chiffreGrand}>{t.promesse.chiffreDelai}</span>
                  <span className={s.legende}>{t.promesse.legendeDelai}</span>
                </div>
                <div className={s.chiffre}>
                  <span className={s.chiffreGrand}>{m.fraisChiffre}</span>
                  <span className={s.legende}>{t.promesse.legendeFrais}</span>
                </div>
                <div className={s.chiffre}>
                  <span className={s.chiffreGrand}>{t.promesse.chiffreAbsence}</span>
                  <span className={s.legende}>{t.promesse.legendeAbsence}</span>
                </div>
              </div>
            </div>
            <div className={s.gap8}>
              <div className={s.defilement}>
                <div className={s.masque}>
                  <ColonnePhotos photos={PHOTOS_HAUT.monte} sens="monte" />
                </div>
                <div className={s.masque}>
                  <ColonnePhotos photos={PHOTOS_HAUT.descend} sens="descend" />
                </div>
              </div>
              <div className={s.confirme}>
                <span className={s.confirmeHeure}>{t.promesse.confirmationHeure}</span>
                <span className={s.confirmeTexte}>{t.promesse.confirmation}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={s.confiance} aria-label={t.confiance.titre}>
          <span className={s.confianceTitre}>{t.confiance.titre}</span>
          <div className={s.logos}>
            {partenaires.map((l, i) => (
              <div key={i} className={s.logoPartenaire}>
                {l ? <img src={l.src} alt={l.nom} /> : <span>{t.confiance.logo}</span>}
              </div>
            ))}
          </div>
        </section>

        <section id="etapes" className={s.etapes}>
          <div className={s.intro}>
            <span className={s.surtitre}>{t.etapes.surtitre}</span>
            <h2 className={s.titreFort}>{t.etapes.titre}</h2>
            <p className={s.texte}>{t.etapes.texte}</p>
          </div>
          <div className={s.grille280}>
            {t.etapes.liste.map((e) => (
              <div key={e.n} className={s.carteEtape}>
                <div className={s.carteEtapeHaut}>
                  <span className={s.numero}>{e.n}</span>
                  <span className={s.heure}>{e.heure}</span>
                </div>
                <h3 className={s.carteTitre}>{e.titre}</h3>
                <p className={s.texte}>{e.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="app" className={`${s.deuxColonnes} ${s.fondBlanc} ${s.centre}`}>
          <div className={s.gap32}>
            <div className={s.gap8}>
              <span className={`${s.surtitre} ${s.galet}`}>{t.app.surtitre}</span>
              <h2 className={s.titreSection}>{t.app.titre}</h2>
              <p className={`${s.texte} ${s.galet}`}>{t.app.texte}</p>
            </div>
            <div className={s.liste}>
              {t.app.arguments.map((a) => (
                <div key={a.titre} className={s.argument}>
                  <span className={s.argumentTitre}>{a.titre}</span>
                  <span className={s.texte}>{a.texte}</span>
                </div>
              ))}
            </div>
            <div className={s.boutons}>
              <a href={LIENS_VITRINE.telechargerApp} className={s.boutonBasalte}>
                {t.app.bouton}
              </a>
            </div>
            <span className={`${s.legende} ${s.galet}`}>{m.noteApp}</span>
          </div>
          <div className={s.blocCurcuma}>
            <span className={s.badgeIncline}>{t.app.badge}</span>
            <div className={s.telephone} aria-hidden="true">
              <div className={s.telephoneHaut}>
                <LogoKivien largeur={60} />
                <span className={s.telephoneOnglet}>{t.app.ecranTitre}</span>
              </div>
              <div className={s.telephoneListe}>
                <div className={s.mission}>
                  <div className={s.missionHaut}>
                    <span className={s.missionHoraire}>{t.app.mission1Horaire}</span>
                    <span className={s.badgeCeSoir}>{t.app.badge}</span>
                  </div>
                  <span className={s.corpsFort}>{t.app.mission1Lieu}</span>
                  <span className={s.corpsFort}>≈ {m.net} net</span>
                  <span className={`${s.legende} ${s.galet}`}>{m.brut} brut, congés payés compris</span>
                  <span className={s.retourAssure}>{t.app.mission1Retour}</span>
                </div>
                <div className={s.mission}>
                  <span className={s.missionHoraire}>{t.app.mission2Horaire}</span>
                  <span className={s.corpsFort}>{t.app.mission2Lieu}</span>
                  <span className={`${s.legende} ${s.galet}`}>{t.app.mission2Retour}</span>
                </div>
              </div>
              <div className={s.telephoneBas}>
                <div className={s.boutonEcran}>{t.app.boutonEcran}</div>
              </div>
            </div>
          </div>
        </section>

        <section id="contrat" className={`${s.deuxColonnes} ${s.centre}`}>
          <div className={s.gap32}>
            <div className={s.gap8}>
              <span className={`${s.surtitre} ${s.galet}`}>{t.contrat.surtitre}</span>
              <h2 className={s.titreSection}>{t.contrat.titre}</h2>
              <p className={`${s.texte} ${s.galet}`}>{t.contrat.texte}</p>
            </div>
            <div className={s.liste}>
              {t.contrat.liste.map((c) => (
                <div key={c.titre} className={s.pointContrat}>
                  <Coche />
                  <div className={s.gap4}>
                    <span className={s.corpsFort}>{c.titre}</span>
                    <span className={`${s.texte} ${s.galet}`}>{c.texte}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={s.carteContrat}>
            <div className={s.carteContratHaut}>
              <span className={s.carteContratTitre}>{t.contrat.carteTitre}</span>
              <span className={`${s.legendeForte} ${s.galet}`}>{t.contrat.carteType}</span>
            </div>
            <div className={s.lignes}>
              {[
                [t.contrat.employeur, t.contrat.employeurValeur],
                [t.contrat.salarie, t.contrat.salarieValeur],
                [t.contrat.horaires, t.contrat.horairesValeur],
                [t.contrat.taux, m.tauxCarte],
              ].map(([cle, valeur]) => (
                <div key={cle} className={s.ligne}>
                  <span className={s.galet}>{cle}</span>
                  <span className={s.valeur}>{valeur}</span>
                </div>
              ))}
            </div>
            <div className={s.signature}>
              <svg width="160" height="56" viewBox="0 0 160 56" fill="none" stroke={BASALTE} strokeWidth="2" strokeLinecap="round" className={s.trace} aria-hidden="true">
                <path d="M4 40c10-22 18-30 22-24s-8 26 0 24 14-28 22-26-4 22 4 22 10-16 18-16 6 12 14 12 16-10 26-14 20-4 30-6" />
              </svg>
              <span className={`${s.legende} ${s.galet}`}>{t.contrat.signature}</span>
            </div>
          </div>
        </section>

        <section className={s.temoignages}>
          <div className={s.introCentree}>
            <span className={`${s.surtitre} ${s.piment}`}>{t.temoignages.surtitre}</span>
            <h2 className={s.titreFort}>{t.temoignages.titre}</h2>
            <p className={`${s.legende} ${s.galet}`}>{t.temoignages.avertissement}</p>
          </div>
          <Temoignages photos={PHOTOS_TEMOIGNAGES} />
        </section>

        <section id="garanties" className={s.garanties}>
          <div className={s.intro}>
            <span className={`${s.surtitre} ${s.galet}`}>{t.garanties.surtitre}</span>
            <h2 className={s.titreSection}>{t.garanties.titre}</h2>
          </div>
          <div className={s.grilleGaranties}>
            {t.garanties.liste.map((g, i) => (
              <div key={g.titre} className={s.carteGarantie} data-variante={i}>
                <span className={s.garantieGrand}>{g.grand}</span>
                <span className={s.argumentTitre}>{g.titre}</span>
                <span className={s.texte}>{g.texte}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="tarif" className={`${s.deuxColonnes} ${s.fondBlanc} ${s.haut}`}>
          <div className={s.gap16}>
            <span className={`${s.surtitre} ${s.galet}`}>{t.tarif.surtitre}</span>
            <div className={s.prix}>
              <span className={s.prixGrand}>{m.fraisCourt}</span>
              <span className={s.corpsFort}>{t.tarif.parMiseEnRelation}</span>
            </div>
            <span className={s.texte}>{t.tarif.nonFacture}</span>
            <span className={`${s.texte} ${s.galet}`}>{t.tarif.sansEngagement}</span>
            <span className={s.corpsFort}>{t.tarif.comparaison}</span>
          </div>
          <div className={s.exemple}>
            <span className={`${s.legendeForte} ${s.galet}`}>{t.tarif.exemple}</span>
            <div className={`${s.ligneTarif} ${s.ligneTarifSepare}`}>
              <div className={s.gap4}>
                <span className={s.corpsFort}>{t.tarif.salaire}</span>
                <span className={`${s.legende} ${s.galet}`}>{m.detailSalaire}</span>
              </div>
              <span className={s.montant}>{m.brut} brut</span>
            </div>
            <div className={s.ligneTarif}>
              <div className={s.gap4}>
                <span className={s.corpsFort}>{t.tarif.frais}</span>
                <span className={`${s.legende} ${s.galet}`}>{t.tarif.fraisDetail}</span>
              </div>
              <span className={s.montant}>{m.fraisDetail}</span>
            </div>
            <span className={`${s.legende} ${s.galet}`}>{m.noteTarif}</span>
          </div>
        </section>

        <section className={s.lettre} aria-label={t.lettre.titre}>
          <div className={s.lettreIntro}>
            <span className={s.lettreTitre}>{t.lettre.titre}</span>
            <span className={`${s.texte} ${s.galet}`}>{t.lettre.texte}</span>
          </div>
          <Lettre />
        </section>

        <footer className={s.pied}>
          <div className={s.piedColonnes}>
            <div className={s.gap8}>
              <LogoKivien largeur={88} encre={CREME} pilule={CREME} />
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
      </div>
    </div>
  );
}
