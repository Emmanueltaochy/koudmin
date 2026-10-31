import { textesVitrine as t } from '@kivien/core';
import { LIENS_VITRINE } from '@/lib/vitrine/liens';
import s from '@/app/(vitrine)/vitrine.module.css';
import { LogoKivien } from './LogoKivien';

/** Bandeau de lancement, à placer tout en haut des pages publiques. */
export function BandeauLancement() {
  return (
    <div className={s.lancement} role="note">
      <strong className={s.lancementTitre}>{t.lancement}</strong>
      <span className={s.lancementTexte}>{t.lancementTexte}</span>
    </div>
  );
}

/** En-tête commun des pages publiques (accueil, établissements, extras), sur fond sombre. */
export function EnteteVitrine() {
  return (
    <header className={s.entete}>
      <a href="/" aria-label="Kivien, accueil">
        <LogoKivien largeur={88} encre="#FBF6EE" pilule="#C2401E" />
      </a>
      <nav className={s.nav} aria-label="Navigation">
        <a href="/pro">{t.nav.etablissements}</a>
        <a href="/extras">{t.nav.extras}</a>
        <a href="/pro#tarif">{t.nav.tarif}</a>
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
  );
}
