'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Check, CircleAlert, FileText, Minus, Plus } from 'lucide-react';
import {
  aujourdhuiReunion,
  ajouterJours,
  champsACompleter,
  choixDates,
  dureeMinutes,
  formatEuros,
  formatHT,
  formatPlage,
  fraisParExtra,
  jourMoisCourt,
  legendeFrais,
  legendeSalaires,
  LIBELLES_POSTE,
  lireHeure,
  lireMontant,
  minuteReunion,
  montantSaisie,
  NB_EXTRAS_MAX,
  NB_EXTRAS_MIN,
  ORDRE_CHAMPS,
  phraseDuree,
  POSTES,
  recapDemande,
  saisieParDefaut,
  textes as t,
  validerDemande,
  type ErreursDemande,
  type ParametresTarifaires,
  type SaisieDemande,
} from '@koudmin/core';
import { ChampAdresse } from '@/components/ChampAdresse';
import { ChampHeure } from '@/components/ChampHeure';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { geocoder, type AdresseGeo } from '@/lib/adresse';
import { donneesFictives, ErreurReseau, source } from '@/lib/donnees';
import s from './demande.module.css';

const td = t.resto.demande;
const PRESETS = [
  { debut: '18:00', fin: '00:00' },
  { debut: '11:30', fin: '15:00' },
];
/** Une demande se publie au plus 30 jours à l'avance. */
const HORIZON_JOURS = 30;
const ERREUR_ENVOI = "La demande n'est pas partie. Vérifiez la connexion et réessayez.";
const ERREUR_ADRESSE_INTROUVABLE = 'Adresse introuvable à La Réunion. Choisissez une proposition de la liste.';

type Demo = 'envoi' | 'erreur';

function libellePlage(debut: string, fin: string) {
  const d = lireHeure(debut);
  const f = lireHeure(fin);
  return d === null || f === null ? '' : `${d}-${f}`;
}

export function FormulaireDemande() {
  const router = useRouter();
  const parametresUrl = useSearchParams();
  const demo = donneesFictives ? (parametresUrl.get('demo') as Demo | null) : null;
  const [parametres, setParametres] = useState<ParametresTarifaires | null>(null);
  const [saisie, setSaisie] = useState<SaisieDemande | null>(null);
  const [adresseGeo, setAdresseGeo] = useState<AdresseGeo | null>(null);
  const [erreurs, setErreurs] = useState<ErreursDemande>({});
  const [tente, setTente] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const resume = useRef<HTMLDivElement>(null);
  const champDate = useRef<HTMLInputElement>(null);
  const aujourdhui = aujourdhuiReunion();

  // Paramètres en vigueur (SMIC, frais) et adresse habituelle du restaurant.
  useEffect(() => {
    void (async () => {
      const [p, r] = await Promise.all([source().parametres(), source().restaurant()]);
      setParametres(p);
      const base = saisieParDefaut(aujourdhuiReunion(), p.tauxHoraireBrutCentimes);
      if (demo === 'erreur') {
        setSaisie(base);
        setTente(true);
        setErreurs(validerDemande(base, p.tauxHoraireBrutCentimes, { jour: aujourdhuiReunion(), minute: 0 }));
        return;
      }
      setSaisie({ ...base, adresse: r.adresse?.libelle ?? '', consignes: '' });
      setAdresseGeo(r.adresse);
      if (demo === 'envoi') setEnvoi(true);
    })();
  }, [demo]);

  const smic = parametres?.tauxHoraireBrutCentimes ?? 0;
  const maintenant = () => ({ jour: aujourdhuiReunion(), minute: minuteReunion() });

  // Après une première tentative, les erreurs se mettent à jour pendant la correction.
  function modifier(m: Partial<SaisieDemande>) {
    setSaisie((prev) => {
      if (!prev) return prev;
      const suivante = { ...prev, ...m };
      if (tente && parametres) setErreurs(validerDemande(suivante, smic, maintenant()));
      return suivante;
    });
  }

  const minutes = saisie ? dureeMinutes(lireHeure(saisie.debut) ?? -1, lireHeure(saisie.fin) ?? -1) : null;
  const heuresValides = saisie && lireHeure(saisie.debut) !== null && lireHeure(saisie.fin) !== null && minutes !== null;
  const tauxSaisi = saisie ? lireMontant(saisie.taux) : null;
  const tauxCalcul = tauxSaisi !== null && tauxSaisi >= smic ? tauxSaisi : smic;

  const recap = useMemo(() => {
    if (!saisie || !parametres) return null;
    return recapDemande({
      minutes: heuresValides ? minutes! : 0,
      tauxHoraireBrutCentimes: tauxCalcul,
      nbExtras: saisie.nbExtras,
      fraisMiseEnRelationHTCentimes: parametres.fraisMiseEnRelationHTCentimes,
    });
  }, [saisie, parametres, heuresValides, minutes, tauxCalcul]);

  if (!saisie || !parametres || !recap) {
    return <div className={s.page} aria-busy="true" />;
  }

  const dates = choixDates(aujourdhui);
  const dateLibre = saisie.jour && !dates.some((d) => d.jour === saisie.jour) ? saisie.jour : null;
  const presetActif = PRESETS.findIndex((p) => libellePlage(p.debut, p.fin) === libellePlage(saisie.debut, saisie.fin));
  const nbErreurs = Object.keys(erreurs).length;

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (envoi || !saisie || !parametres) return;
    setTente(true);
    setErreurEnvoi(null);
    const trouvees = validerDemande(saisie, smic, maintenant());
    setErreurs(trouvees);
    if (Object.keys(trouvees).length) {
      focaliserResume();
      return;
    }
    setEnvoi(true);
    try {
      // Adresse tapée sans choisir de proposition : on la géocode maintenant.
      let geo = adresseGeo && adresseGeo.libelle === saisie.adresse ? adresseGeo : null;
      if (!geo) {
        geo = await geocoder(saisie.adresse).catch(() => null);
        if (!geo) {
          setErreurs({ adresse: ERREUR_ADRESSE_INTROUVABLE });
          setEnvoi(false);
          focaliserResume();
          return;
        }
      }
      const { id } = await source().publier({
        poste: saisie.poste!,
        jour: saisie.jour!,
        debut: lireHeure(saisie.debut)!,
        fin: lireHeure(saisie.fin)!,
        tauxHoraireBrutCentimes: lireMontant(saisie.taux)!,
        adresse: geo,
        retourAssure: saisie.retourAssure,
        nbExtras: saisie.nbExtras,
        consignes: saisie.consignes.trim() || null,
      });
      router.push(`/demandes/${id}`);
    } catch (err) {
      if (!(err instanceof ErreurReseau || err instanceof TypeError)) console.error(err);
      setErreurEnvoi(ERREUR_ENVOI);
      setEnvoi(false);
      focaliserResume();
    }
  }

  function focaliserResume() {
    requestAnimationFrame(() => {
      resume.current?.focus();
      resume.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  const err = (c: keyof ErreursDemande) => (tente ? erreurs[c] : undefined);
  const premiereErreur = ORDRE_CHAMPS.find((c) => erreurs[c]);

  return (
    <div className={s.page}>
      <div className={s.intro}>
        <h1 className={ui.titre}>{td.titre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{td.sousTitre}</p>
      </div>

      {(tente && nbErreurs > 0) || erreurEnvoi ? (
        <div ref={resume} tabIndex={-1} role="alert" className={`${ui.encadreErreur} ${s.resume}`}>
          <CircleAlert size={20} strokeWidth={2} className={ui.icone} style={{ marginTop: 2 }} aria-hidden />
          <div>
            {nbErreurs > 0 ? (
              <a href={`#champ-${premiereErreur}`} className={s.lienResume}>
                {champsACompleter(nbErreurs)}
              </a>
            ) : (
              erreurEnvoi
            )}
          </div>
        </div>
      ) : null}

      <form className={s.grille} onSubmit={envoyer} noValidate>
        <fieldset className={s.champs} disabled={envoi} data-envoi={envoi}>
          <legend className="sr-only">{td.titre}</legend>

          {/* Poste */}
          <div className={s.bloc} id="champ-poste">
            <span className={ui.corpsFort} id="lib-poste">
              {td.poste}
            </span>
            <div role="radiogroup" aria-labelledby="lib-poste" className={s.chips}>
              {POSTES.map((p) => {
                const actif = saisie.poste === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    className={s.chip}
                    onClick={() => modifier({ poste: p })}
                  >
                    {actif && <Check size={16} strokeWidth={2.5} aria-hidden />}
                    {LIBELLES_POSTE[p].court}
                  </button>
                );
              })}
            </div>
            {err('poste') && <p className={ui.messageErreur}>{err('poste')}</p>}
          </div>

          {/* Date */}
          <div className={s.bloc} id="champ-jour">
            <span className={ui.corpsFort} id="lib-date">
              {td.date}
            </span>
            <div role="radiogroup" aria-labelledby="lib-date" className={s.dates}>
              {dates.map((d) => {
                const actif = saisie.jour === d.jour;
                return (
                  <button
                    key={d.jour}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    className={s.caseDate}
                    onClick={() => modifier({ jour: d.jour })}
                  >
                    <span className={s.caseLibelle}>{d.libelle}</span>
                    <span className={ui.corpsFort}>{d.valeur}</span>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={!!dateLibre}
                aria-label="Choisir une autre date"
                className={`${s.caseDate} ${dateLibre ? s.caseLibreActive : s.caseCalendrier}`}
                onClick={() => {
                  const c = champDate.current;
                  if (!c) return;
                  try {
                    c.showPicker();
                  } catch {
                    c.focus();
                    c.click();
                  }
                }}
              >
                {dateLibre ? (
                  <>
                    <span className={s.caseLibelle}>Autre date</span>
                    <span className={ui.corpsFort}>{jourMoisCourt(dateLibre)}</span>
                  </>
                ) : (
                  <CalendarDays size={20} strokeWidth={2} aria-hidden />
                )}
              </button>
              <input
                ref={champDate}
                type="date"
                className={s.dateCachee}
                tabIndex={-1}
                aria-hidden
                min={aujourdhui}
                max={ajouterJours(aujourdhui, HORIZON_JOURS)}
                value={saisie.jour ?? ''}
                onChange={(e) => e.target.value && modifier({ jour: e.target.value })}
              />
            </div>
            {err('jour') && <p className={ui.messageErreur}>{err('jour')}</p>}
          </div>

          {/* Horaires */}
          <div className={s.bloc} id="champ-horaires">
            <span className={ui.corpsFort} id="lib-horaires">
              {td.horaires}
            </span>
            <div role="radiogroup" aria-labelledby="lib-horaires" className={s.chips}>
              {PRESETS.map((p, i) => (
                <button
                  key={p.debut}
                  type="button"
                  role="radio"
                  aria-checked={presetActif === i}
                  className={`${ui.pilule} ${s.piluleForte}`}
                  onClick={() => modifier({ debut: p.debut, fin: p.fin })}
                >
                  {i === 0 ? '18 h – minuit' : '11 h 30 – 15 h'}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={presetActif < 0}
                className={ui.pilule}
                onClick={() => document.getElementById('debut')?.focus()}
              >
                {td.horaireAutre}
              </button>
            </div>
            <div className={s.heures}>
              <label className={s.heure}>
                <span className={ui.legende}>{td.debut}</span>
                <span className={ui.champ} data-erreur={!!err('horaires')}>
                  <ChampHeure
                    id="debut"
                    libelle={td.debut}
                    valeur={saisie.debut}
                    onChange={(v) => modifier({ debut: v })}
                    invalide={!!err('horaires')}
                  />
                </span>
              </label>
              <span className={`${ui.galet} ${s.tiret}`} aria-hidden>
                –
              </span>
              <label className={s.heure}>
                <span className={ui.legende}>{td.fin}</span>
                <span className={ui.champ} data-erreur={!!err('horaires')}>
                  <ChampHeure
                    libelle={td.fin}
                    valeur={saisie.fin}
                    onChange={(v) => modifier({ fin: v })}
                    invalide={!!err('horaires')}
                  />
                </span>
              </label>
            </div>
            {err('horaires') ? (
              <p className={ui.messageErreur}>{err('horaires')}</p>
            ) : (
              heuresValides && <p className={ui.legende}>{phraseDuree(minutes!)}</p>
            )}
          </div>

          {/* Taux horaire */}
          <div className={s.bloc} id="champ-taux">
            <label htmlFor="taux" className={ui.corpsFort}>
              {td.taux}
            </label>
            <span className={ui.champ} data-erreur={!!err('taux')}>
              <input
                id="taux"
                inputMode="decimal"
                value={saisie.taux}
                onChange={(e) => modifier({ taux: e.target.value })}
                onBlur={() => {
                  const c = lireMontant(saisie.taux);
                  if (c !== null) modifier({ taux: montantSaisie(c) });
                }}
                aria-invalid={!!err('taux')}
                aria-describedby="taux-legende"
                className={s.taux}
              />
              <span className={ui.corpsFort}>€</span>
              <span className={`${ui.corps} ${ui.galet} ${s.suffixe}`}>{td.tauxSuffixe}</span>
            </span>
            {err('taux') ? (
              <p className={ui.messageErreur} id="taux-legende">
                {err('taux')}
              </p>
            ) : (
              <p className={ui.legende} id="taux-legende">
                {td.tauxLegende}
              </p>
            )}
          </div>

          {/* Adresse et retour */}
          <div className={s.bloc} id="champ-adresse">
            <label htmlFor="adresse" className={ui.corpsFort}>
              {td.adresse}
            </label>
            <ChampAdresse
              id="adresse"
              valeur={saisie.adresse}
              erreur={err('adresse')}
              desactive={envoi}
              onSaisie={(texte) => modifier({ adresse: texte })}
              onChoix={(a) => {
                setAdresseGeo(a);
                modifier({ adresse: a.libelle });
              }}
            />
            <label className={s.retour}>
              <input
                type="checkbox"
                checked={saisie.retourAssure}
                onChange={(e) => modifier({ retourAssure: e.target.checked })}
                className={s.caseACocher}
              />
              <span className={s.caseVisuelle} aria-hidden>
                {saisie.retourAssure && <Check size={16} strokeWidth={2.5} />}
              </span>
              <span className={s.retourTextes}>
                <span className={ui.corps}>{td.retour}</span>
                <span className={ui.legende}>{td.retourLegende}</span>
              </span>
            </label>
          </div>

          {/* Nombre d'extras */}
          <div className={s.nombre} id="champ-nbExtras">
            <div className={s.nombreTextes}>
              <span className={ui.corpsFort} id="lib-nb">
                {td.nbExtras}
              </span>
              <span className={ui.legende}>{fraisParExtra(parametres.fraisMiseEnRelationHTCentimes)}</span>
            </div>
            <div className={s.stepper} role="group" aria-labelledby="lib-nb">
              <button
                type="button"
                aria-label="Un extra de moins"
                disabled={saisie.nbExtras <= NB_EXTRAS_MIN}
                onClick={() => modifier({ nbExtras: saisie.nbExtras - 1 })}
              >
                <Minus size={20} strokeWidth={2} className={ui.galet} aria-hidden />
              </button>
              <output aria-live="polite" className={s.valeur}>
                {saisie.nbExtras}
              </output>
              <button
                type="button"
                aria-label="Un extra de plus"
                disabled={saisie.nbExtras >= NB_EXTRAS_MAX}
                onClick={() => modifier({ nbExtras: saisie.nbExtras + 1 })}
              >
                <Plus size={20} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          {/* Consignes */}
          <div className={s.bloc} id="champ-consignes">
            <div className={s.ligneLibelle}>
              <label htmlFor="consignes" className={ui.corpsFort}>
                {td.consignes}
              </label>
              <span className={ui.legende}>{td.facultatif}</span>
            </div>
            <textarea
              id="consignes"
              className={s.zoneTexte}
              placeholder={td.consignesPlaceholder}
              value={saisie.consignes}
              maxLength={500}
              onChange={(e) => modifier({ consignes: e.target.value })}
            />
            {err('consignes') && <p className={ui.messageErreur}>{err('consignes')}</p>}
          </div>
        </fieldset>

        {/* Récapitulatif en direct et envoi */}
        <aside className={s.action} aria-label="Récapitulatif">
          <div className={s.ligneRecap}>
            <div className={s.montant}>
              <span className={ui.corps}>{td.salaires}</span>
              <span className={ui.corpsFort} aria-live="polite">
                {heuresValides ? formatEuros(recap.salairesBrutsCentimes) : '—'}
              </span>
            </div>
            <p className={ui.legende}>
              {heuresValides
                ? legendeSalaires(saisie.nbExtras, minutes!, tauxCalcul)
                : "Indiquez l'heure de début et de fin."}
            </p>
          </div>
          <div className={`${s.ligneRecap} ${s.ligneSeparee}`}>
            <div className={s.montant}>
              <span className={ui.corps}>{td.frais}</span>
              <span className={ui.corpsFort} aria-live="polite">
                {formatHT(recap.fraisHTCentimes)}
              </span>
            </div>
            <p className={ui.legende}>{legendeFrais(saisie.nbExtras, parametres.fraisMiseEnRelationHTCentimes)}</p>
          </div>
          <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
            {envoi ? (
              <>
                <Spinner />
                {td.envoi}
              </>
            ) : (
              td.envoyer
            )}
          </button>
          <p className={`${ui.legende} ${s.contrat}`}>
            <FileText size={16} strokeWidth={2} aria-hidden />
            {td.contrat}
          </p>
        </aside>
      </form>
    </div>
  );
}
