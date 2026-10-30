'use client';

import { useState, type FormEvent } from 'react';
import { Building2, Check } from 'lucide-react';
import {
  DEFINITION_SECTEURS,
  formatSiret,
  normaliserSiret,
  textes as t,
  textesEcrans,
  validerInscriptionResto,
  type ErreursInscriptionResto,
  type Secteur,
} from '@kivien/core';
import { ChampAdresse } from '@/components/ChampAdresse';
import { ChoixSecteur } from '@/components/ChoixSecteur';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import type { AdresseGeo } from '@/lib/adresse';
import { choisirEtablissement, source, type Restaurant } from '@/lib/donnees';
import { useDonnees } from '@/lib/useDonnees';
import s from './etablissements.module.css';

const te = textesEcrans.resto.etablissements;
const ti = textesEcrans.resto.inscription;
const tr = textesEcrans.resto.roles;

type Erreurs = ErreursInscriptionResto & { general?: string };

/** Formulaire d'ajout (nom, secteur, SIRET, adresse) ou de modification (nom, adresse). */
function FormEtablissement({
  existant,
  onFini,
}: {
  existant?: Restaurant;
  onFini: (message: string, id?: string) => void;
}) {
  const [nom, setNom] = useState(existant?.nom ?? '');
  const [secteur, setSecteur] = useState<Secteur | ''>(existant?.secteur ?? '');
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState(existant?.adresse?.libelle ?? '');
  const [geo, setGeo] = useState<AdresseGeo | null>(existant?.adresse ?? null);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const prefixe = existant ? `modif-${existant.id}` : 'nouvel';

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    const tout = validerInscriptionResto(
      { etablissement: nom, secteur, adresseChoisie: !!geo && geo.libelle === adresse, siret, telephone: '', motDePasse: '' },
      true,
    );
    // En modification, seuls le nom et l'adresse changent (secteur et SIRET restent ceux de l'inscription).
    const err: Erreurs = existant
      ? Object.fromEntries(Object.entries(tout).filter(([cle]) => cle === 'etablissement' || cle === 'adresseChoisie'))
      : tout;
    setErreurs(err);
    if (Object.keys(err).length || !geo) return;
    setEnvoi(true);
    try {
      if (existant) {
        const r = await source().modifierEtablissement(existant.id, { nom, adresse: geo });
        if (r === 'adresse') setErreurs({ adresseChoisie: ti.erreurAdresse });
        else return onFini(te.enregistre);
      } else {
        const r = await source().ajouterEtablissement({ nom, siret, secteur: secteur as Secteur, adresse: geo });
        if (r.resultat === 'ok') return onFini(te.ajoute, r.id);
        setErreurs(
          r.resultat === 'siret'
            ? { siret: ti.siretDejaInscrit }
            : r.resultat === 'siretInvalide'
              ? { siret: ti.erreurSiret }
              : r.resultat === 'adresse'
                ? { adresseChoisie: ti.erreurAdresse }
                : { general: ti.compteExtra },
        );
      }
    } catch {
      setErreurs({ general: ti.erreurServeur });
    }
    setEnvoi(false);
  }

  return (
    <form onSubmit={envoyer} className={s.formulaire} noValidate>
      <div className={s.bloc}>
        <label htmlFor={`${prefixe}-nom`} className={ui.corpsFort}>
          {ti.etablissement}
        </label>
        <span className={ui.champ} data-erreur={!!erreurs.etablissement}>
          <input id={`${prefixe}-nom`} value={nom} maxLength={120} disabled={envoi} onChange={(e) => setNom(e.target.value)} />
        </span>
        {erreurs.etablissement && <p className={ui.messageErreur}>{erreurs.etablissement}</p>}
      </div>
      {!existant && (
        <>
          <div className={s.bloc}>
            <label htmlFor={`${prefixe}-secteur`} className={ui.corpsFort}>
              {ti.secteur}
            </label>
            <ChoixSecteur id={`${prefixe}-secteur`} valeur={secteur} erreur={erreurs.secteur} aide={ti.secteurAide} desactive={envoi} onChange={setSecteur} />
          </div>
          <div className={s.bloc}>
            <label htmlFor={`${prefixe}-siret`} className={ui.corpsFort}>
              {ti.siret}
            </label>
            <span className={ui.champ} data-erreur={!!erreurs.siret}>
              <input
                id={`${prefixe}-siret`}
                inputMode="numeric"
                autoComplete="off"
                value={siret}
                disabled={envoi}
                onChange={(e) => setSiret(e.target.value)}
                onBlur={() => normaliserSiret(siret).length === 14 && setSiret(formatSiret(siret))}
              />
            </span>
            <p className={erreurs.siret ? ui.messageErreur : ui.legende}>{erreurs.siret ?? ti.siretAide}</p>
          </div>
        </>
      )}
      <div className={s.bloc}>
        <label htmlFor={`${prefixe}-adresse`} className={ui.corpsFort}>
          {ti.adresse}
        </label>
        <ChampAdresse
          id={`${prefixe}-adresse`}
          valeur={adresse}
          erreur={erreurs.adresseChoisie}
          desactive={envoi}
          onSaisie={setAdresse}
          onChoix={(a) => {
            setGeo(a);
            setAdresse(a.libelle);
          }}
        />
      </div>
      {erreurs.general && (
        <p className={ui.messageErreur} role="alert">
          {erreurs.general}
        </p>
      )}
      <div className={s.actions}>
        <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
          {envoi && <Spinner />}
          {existant ? te.enregistrer : te.ajouter}
        </button>
        <button type="button" className={ui.lienDiscret} onClick={() => onFini('')} disabled={envoi}>
          {te.fermer}
        </button>
      </div>
    </form>
  );
}

export default function Etablissements() {
  const { etat } = useDonnees(async (src) => {
    const [liste, courant] = await Promise.all([src.etablissements(), src.restaurant()]);
    return { liste, courant };
  });
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  if (etat.statut !== 'pret') {
    return (
      <div className={p.page} aria-busy={etat.statut === 'chargement'}>
        {etat.statut === 'erreur' ? <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p> : <div className={p.squelette} />}
      </div>
    );
  }
  const { liste, courant } = etat.donnees;
  const fini = (m: string, id?: string) => {
    setOuvert(null);
    setMessage(m);
    if (id) choisirEtablissement(id);
  };

  return (
    <div className={p.page}>
      <div className={p.intro}>
        <h1 className={ui.titre}>{te.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{te.sousTitre}</p>
      </div>
      {message && (
        <p className={`${ui.corpsFort} ${ui.vacoa}`} role="status">
          {message}
        </p>
      )}

      <ul className={`${p.liste} ${p.grilleCartes}`}>
        {liste.map((r) => (
          <li key={r.id} className={s.carte}>
            <div className={p.entreDeux}>
              <span className={`${p.ligne} ${ui.sousTitre}`}>
                <Building2 size={20} strokeWidth={2} aria-hidden />
                {r.nom}
              </span>
              <span className={s.badge}>{tr[r.role]}</span>
            </div>
            <span className={ui.corps}>{DEFINITION_SECTEURS[r.secteur].libelle}</span>
            {r.adresse && <span className={`${ui.corps} ${ui.galet}`}>{r.adresse.libelle}</span>}
            {r.siret && (
              <span className={ui.legende}>
                {te.siret} {formatSiret(r.siret)}
              </span>
            )}
            {ouvert === r.id ? (
              <FormEtablissement existant={r} onFini={fini} />
            ) : (
              <div className={s.actions}>
                {r.id === courant.id ? (
                  <span className={`${p.ligne} ${ui.legendeForte} ${ui.vacoa}`}>
                    <Check size={16} strokeWidth={2.5} aria-hidden />
                    {te.actif}
                  </span>
                ) : (
                  <button type="button" className={ui.boutonSecondaire} onClick={() => choisirEtablissement(r.id)}>
                    {te.afficher}
                  </button>
                )}
                {r.role === 'gerant' && (
                  <button
                    type="button"
                    className={ui.lienDiscret}
                    onClick={() => {
                      setMessage('');
                      setOuvert(r.id);
                    }}
                  >
                    {te.modifier}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {ouvert === 'nouveau' ? (
        <section className={s.carte} aria-labelledby="titre-ajout">
          <h2 id="titre-ajout" className={ui.sousTitre}>
            {te.ajouter}
          </h2>
          <FormEtablissement onFini={fini} />
        </section>
      ) : (
        <button
          type="button"
          className={`${ui.boutonSecondaire} ${s.ajouter}`}
          onClick={() => {
            setMessage('');
            setOuvert('nouveau');
          }}
        >
          {te.ajouter}
        </button>
      )}
    </div>
  );
}
