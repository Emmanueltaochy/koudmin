'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  formatSiret,
  normaliserEmail,
  normaliserSiret,
  textesEcrans,
  validerInscriptionResto,
  type ErreursInscriptionResto,
  type SaisieInscriptionResto,
  type Secteur,
} from '@kivien/core';
import { ChampAdresse } from '@/components/ChampAdresse';
import { ChoixSecteur } from '@/components/ChoixSecteur';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import type { AdresseGeo } from '@/lib/adresse';
import { aUnEtablissement, changerEmail, connecte, inscrireRestaurateur } from '@/lib/auth';
import { donneesFictives, source } from '@/lib/donnees';
import { noterInscription } from '@/lib/suivi';
import s from '../inscription.module.css';

const ti = textesEcrans.resto.inscription;
const tc = textesEcrans.connexion;

type Erreurs = ErreursInscriptionResto & { general?: string };

/** Inscription d'un établissement : compte actif tout de suite, SIRET et secteur obligatoires. */
export default function InscriptionRestaurant() {
  const router = useRouter();
  const [saisie, setSaisie] = useState({ etablissement: '', secteur: '' as Secteur | '', adresse: '', siret: '', telephone: '', email: '', motDePasse: '' });
  const [adresseGeo, setAdresseGeo] = useState<AdresseGeo | null>(null);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [tente, setTente] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  // Compte déjà ouvert sans établissement (inscription interrompue) : mobile et mot de passe ne sont plus demandés.
  const [compteOuvert, setCompteOuvert] = useState(false);

  useEffect(() => {
    if (donneesFictives) return;
    void (async () => {
      if (!(await connecte())) return;
      if (await aUnEtablissement()) router.replace('/espace');
      else setCompteOuvert(true);
    })().catch(() => undefined);
  }, [router]);

  const pourValidation = (v: typeof saisie, geo: AdresseGeo | null): SaisieInscriptionResto => ({
    etablissement: v.etablissement,
    secteur: v.secteur,
    adresseChoisie: !!geo && geo.libelle === v.adresse,
    siret: v.siret,
    telephone: v.telephone,
    email: v.email,
    motDePasse: v.motDePasse,
  });
  const modifier = (m: Partial<typeof saisie>, geo: AdresseGeo | null = adresseGeo) => {
    const suivante = { ...saisie, ...m };
    setSaisie(suivante);
    // Après une première tentative, les erreurs disparaissent au fil de la correction.
    if (tente) setErreurs(validerInscriptionResto(pourValidation(suivante, geo), compteOuvert));
  };

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setTente(true);
    const err: Erreurs = validerInscriptionResto(pourValidation(saisie, adresseGeo), compteOuvert);
    setErreurs(err);
    if (Object.keys(err).length || !adresseGeo || !saisie.secteur) return;
    setEnvoi(true);
    try {
      const r = await inscrireRestaurateur(
        {
          telephone: saisie.telephone,
          motDePasse: saisie.motDePasse,
          etablissement: saisie.etablissement,
          secteur: saisie.secteur,
          siret: saisie.siret,
          adresse: adresseGeo,
        },
        compteOuvert,
      );
      if (r === 'ok') {
        // Lien de confirmation envoyé sur l'adresse ; l'inscription ne dépend pas de son envoi.
        if (!compteOuvert) await changerEmail(normaliserEmail(saisie.email)).catch(() => undefined);
        // Venu d'un e-mail de prospection : le compte est rattaché à la campagne.
        await source().restaurant().then((resto) => noterInscription(resto.id)).catch(() => undefined);
        router.replace('/espace');
        return;
      }
      // Le compte a pu être créé avant le refus de l'établissement : on ne le recrée pas au prochain essai.
      if (r !== 'numero' && r !== 'attente') setCompteOuvert(true);
      setErreurs(
        r === 'numero'
          ? { telephone: ti.numeroDejaInscrit }
          : r === 'attente'
            ? { general: tc.tropDEssais }
            : r === 'siret'
              ? { siret: ti.siretDejaInscrit }
              : r === 'siretInvalide'
                ? { siret: ti.erreurSiret }
                : r === 'adresse'
                  ? { adresseChoisie: ti.erreurAdresse }
                  : { general: ti.compteExtra },
      );
    } catch {
      setErreurs({ general: ti.erreurServeur });
    }
    setEnvoi(false);
  }

  const champ = (id: Exclude<keyof typeof saisie, 'secteur'>, erreur: string | undefined, aide: string | undefined, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <>
      <span className={ui.champ} data-erreur={!!erreur}>
        <input
          id={id}
          value={saisie[id]}
          onChange={(e) => modifier({ [id]: e.target.value })}
          aria-invalid={!!erreur}
          aria-describedby={`${id}-aide`}
          disabled={envoi}
          {...props}
        />
      </span>
      {(erreur || aide) && (
        <p id={`${id}-aide`} className={erreur ? ui.messageErreur : ui.legende} role={erreur ? 'alert' : undefined}>
          {erreur ?? aide}
        </p>
      )}
    </>
  );

  return (
    <main className={`${p.etroite} ${s.page}`}>
      <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: 'auto' }} />
      <div className={s.intro}>
        <h1 className={ui.titre}>{ti.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{ti.sousTitre}</p>
      </div>
      <form onSubmit={soumettre} className={s.formulaire} noValidate>
        <div className={s.bloc}>
          <label htmlFor="etablissement" className={ui.corpsFort}>
            {ti.etablissement}
          </label>
          {champ('etablissement', erreurs.etablissement, undefined, { autoComplete: 'organization', maxLength: 120 })}
        </div>
        <div className={s.bloc}>
          <label htmlFor="secteur" className={ui.corpsFort}>
            {ti.secteur}
          </label>
          <ChoixSecteur
            id="secteur"
            valeur={saisie.secteur}
            erreur={erreurs.secteur}
            aide={ti.secteurAide}
            desactive={envoi}
            onChange={(secteur) => modifier({ secteur })}
          />
        </div>
        <div className={s.bloc}>
          <label htmlFor="adresse" className={ui.corpsFort}>
            {ti.adresse}
          </label>
          <ChampAdresse
            id="adresse"
            valeur={saisie.adresse}
            erreur={erreurs.adresseChoisie}
            desactive={envoi}
            onSaisie={(texte) => modifier({ adresse: texte })}
            onChoix={(a) => {
              setAdresseGeo(a);
              modifier({ adresse: a.libelle }, a);
            }}
          />
        </div>
        <div className={s.bloc}>
          <label htmlFor="siret" className={ui.corpsFort}>
            {ti.siret}
          </label>
          {champ('siret', erreurs.siret, ti.siretAide, {
            inputMode: 'numeric',
            autoComplete: 'off',
            placeholder: '732 829 320 00074',
            onBlur: () => normaliserSiret(saisie.siret).length === 14 && modifier({ siret: formatSiret(saisie.siret) }),
          })}
        </div>
        {!compteOuvert && (
          <>
            <div className={s.bloc}>
              <label htmlFor="telephone" className={ui.corpsFort}>
                {ti.telephone}
              </label>
              {champ('telephone', erreurs.telephone, ti.telephoneAide, { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0692 12 34 56' })}
            </div>
            <div className={s.bloc}>
              <label htmlFor="email" className={ui.corpsFort}>
                {textesEcrans.resto.compte.email}
              </label>
              {champ('email', erreurs.email, textesEcrans.resto.compte.emailAide, { type: 'email', autoComplete: 'email', placeholder: 'contact@monetablissement.re' })}
            </div>
            <div className={s.bloc}>
              <label htmlFor="mot-de-passe" className={ui.corpsFort}>
                {ti.motDePasse}
              </label>
              <span className={ui.champ} data-erreur={!!erreurs.motDePasse}>
                <input
                  id="mot-de-passe"
                  type="password"
                  autoComplete="new-password"
                  value={saisie.motDePasse}
                  onChange={(e) => modifier({ motDePasse: e.target.value })}
                  aria-invalid={!!erreurs.motDePasse}
                  aria-describedby="mot-de-passe-aide"
                  disabled={envoi}
                />
              </span>
              <p id="mot-de-passe-aide" className={erreurs.motDePasse ? ui.messageErreur : ui.legende} role={erreurs.motDePasse ? 'alert' : undefined}>
                {erreurs.motDePasse ?? ti.motDePasseAide}
              </p>
            </div>
          </>
        )}
        {erreurs.general && (
          <p className={ui.messageErreur} role="alert">
            {erreurs.general}
          </p>
        )}
        <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
          {envoi && <Spinner />}
          {ti.bouton}
        </button>
      </form>
      <Link href="/connexion" className={ui.lienDiscret}>
        {ti.dejaCompte}
      </Link>
    </main>
  );
}
