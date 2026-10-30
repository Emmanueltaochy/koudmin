'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Mail, MapPinned, Phone, Send } from 'lucide-react';
import {
  CATEGORIES_PROSPECT,
  formatEuros,
  LIBELLES_CATEGORIE_PROSPECT,
  LIBELLES_ZONE,
  modeleCampagne,
  STATUTS_PROSPECT,
  textes as t,
  textesEcrans,
  ZONES,
  zoneDuLieu,
  type CategorieProspect,
  type StatutProspect,
  type Zone,
} from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { source, type CampagneProspection, type Prospect } from '@/lib/donnees';
import s from './admin.module.css';

const tp = textesEcrans.resto.admin.prospection;
const sansAccents = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Indian/Reunion' });

/** Cellule e-mail : affichée, ou saisie à la main quand OpenStreetMap n'en donne pas. */
function CelluleEmail({ prospect: x, onModifie }: { prospect: Prospect; onModifie: () => void }) {
  const [edition, setEdition] = useState(false);
  const [email, setEmail] = useState(x.email ?? '');
  const [erreur, setErreur] = useState(false);
  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    const r = await source().admin.prospection.modifier(x.id, { email: email.trim() || null, telephone: x.telephone, statut: x.statut, notes: x.notes });
    if (r === 'email') return setErreur(true);
    setEdition(false);
    onModifie();
  }
  if (edition)
    return (
      <form onSubmit={enregistrer} className={s.emailForm} noValidate>
        <input type="email" aria-label={tp.ajouterEmail} value={email} onChange={(e) => { setEmail(e.target.value); setErreur(false); }} autoFocus />
        <button type="submit" className={ui.lien}>{tp.enregistrer}</button>
        {erreur && <span className={`${ui.legende} ${ui.braise}`}>{tp.emailInvalide}</span>}
      </form>
    );
  if (x.email)
    return (
      <span>
        <a href={`mailto:${x.email}`} className={ui.lienDiscret}>{x.email}</a>
        {x.desinscrit && <span className={s.sousLigne}>{tp.desinscrit}</span>}
      </span>
    );
  return <button type="button" className={ui.lienDiscret} onClick={() => setEdition(true)}>{tp.ajouterEmail}</button>;
}

/** Prospection : établissements de l'île (OpenStreetMap ou saisie), suivi et campagnes e-mail. */
export function Prospection() {
  const [fiches, setFiches] = useState<Prospect[] | 'chargement' | 'erreur'>('chargement');
  const [campagnes, setCampagnes] = useState<CampagneProspection[]>([]);
  const [import_, setImport] = useState<{ enCours: boolean; message: string | null; ok: boolean; detail?: string }>({ enCours: false, message: null, ok: true });
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState<CategorieProspect | ''>('');
  const [zone, setZone] = useState<Zone | ''>('');
  const [statut, setStatut] = useState<StatutProspect | ''>('');
  const [avecEmail, setAvecEmail] = useState(false);
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState<{ enCours: boolean; texte: string | null }>({ enCours: false, texte: null });

  const charger = useCallback(async () => {
    const src = source().admin.prospection;
    try {
      const [f, c] = await Promise.all([src.prospects(), src.campagnes()]);
      setFiches(f);
      setCampagnes(c);
    } catch {
      setFiches('erreur');
    }
  }, []);

  useEffect(() => {
    void charger();
    // Message de lancement, avec les frais en vigueur (table parametres).
    void source()
      .parametres()
      .then((pa) => {
        const m = modeleCampagne(formatEuros(pa.fraisMiseEnRelationHTCentimes));
        setSujet(m.sujet);
        setMessage(m.message);
      });
  }, [charger]);

  async function importer() {
    setImport({ enCours: true, message: tp.importEnCours, ok: true });
    try {
      const src = source().admin.prospection;
      const r = await src.importer(await src.chercherOsm());
      setImport({ enCours: false, message: tp.importFait(r.ajoutes, r.misAJour), ok: true });
      await charger();
    } catch (e) {
      // Le détail (serveur, code HTTP) permet de savoir si OpenStreetMap est saturé ou injoignable.
      setImport({ enCours: false, message: tp.importErreur, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  const liste = Array.isArray(fiches) ? fiches : [];
  const filtrees = useMemo(
    () =>
      liste.filter(
        (x) =>
          (!categorie || x.categorie === categorie) &&
          (!statut || x.statut === statut) &&
          (!avecEmail || !!x.email) &&
          (!zone || zoneDuLieu(x.commune, x.lat, x.lng) === zone) &&
          sansAccents(`${x.nom} ${x.commune ?? ''} ${x.email ?? ''} ${x.telephone ?? ''}`).includes(sansAccents(recherche.trim())),
      ),
    [liste, categorie, statut, avecEmail, zone, recherche],
  );
  const destinataires = filtrees.filter((x) => x.email && !x.desinscrit && x.statut !== 'inscrit' && x.statut !== 'pas_interesse');

  async function changerStatut(x: Prospect, nouveau: StatutProspect) {
    await source().admin.prospection.modifier(x.id, { email: x.email, telephone: x.telephone, statut: nouveau, notes: x.notes });
    await charger();
  }

  async function lancer(e: FormEvent) {
    e.preventDefault();
    if (!destinataires.length || !window.confirm(tp.confirmer(destinataires.length))) return;
    setEnvoi({ enCours: true, texte: null });
    try {
      const n = await source().admin.prospection.lancerCampagne(sujet, message, destinataires.map((x) => x.id));
      setEnvoi({ enCours: false, texte: tp.programme(n) });
      await charger();
    } catch {
      setEnvoi({ enCours: false, texte: t.extra.missions.horsLigneTitre });
    }
  }

  if (fiches === 'chargement') return <div className={p.squelette} aria-busy />;
  if (fiches === 'erreur') return <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p>;

  return (
    <>
      <p className={`${ui.corps} ${ui.galet}`}>{tp.intro}</p>
      <div className={s.importer}>
        <button type="button" className={ui.boutonSecondaire} onClick={() => void importer()} disabled={import_.enCours}>
          {import_.enCours ? <Spinner /> : <MapPinned size={18} strokeWidth={2} aria-hidden />}
          {tp.importer}
        </button>
        {import_.message && (
          <span className={import_.ok ? ui.corps : ui.messageErreur} role="status">{import_.message}</span>
        )}
        {import_.detail && <span className={`${ui.legende} ${ui.galet}`}>{tp.importDetail(import_.detail)}</span>}
        <span className={`${ui.legende} ${ui.galet}`}>{tp.attribution}</span>
      </div>

      <div className={s.chiffres}>
        {[
          [liste.length, tp.total],
          [liste.filter((x) => x.email).length, tp.avecEmail],
          [liste.filter((x) => x.telephone).length, tp.avecTelephone],
          [liste.filter((x) => x.statut !== 'a_contacter').length, tp.contactes],
          [liste.filter((x) => x.statut === 'inscrit').length, tp.inscrits],
        ].map(([v, l], i) => (
          <div key={String(l)} className={s.chiffre} data-accent={i === 0 ? 'true' : undefined}>
            <span className={s.valeur}>{v}</span>
            <span className={ui.legende}>{l}</span>
          </div>
        ))}
      </div>

      {liste.length === 0 ? (
        <p className={`${ui.corps} ${ui.galet}`}>{tp.aucun}</p>
      ) : (
        <>
          <div className={s.filtres}>
            <span className={`${ui.champ} ${s.recherche}`}>
              <input type="search" placeholder={textesEcrans.resto.admin.rechercher} aria-label={textesEcrans.resto.admin.rechercher} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </span>
            <select className={s.choix} aria-label={tp.filtreCategorie} value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieProspect | '')}>
              <option value="">{tp.filtreCategorie}</option>
              {CATEGORIES_PROSPECT.map((c) => <option key={c} value={c}>{LIBELLES_CATEGORIE_PROSPECT[c]}</option>)}
            </select>
            <select className={s.choix} aria-label={tp.filtreZone} value={zone} onChange={(e) => setZone(e.target.value as Zone | '')}>
              <option value="">{tp.filtreZone}</option>
              {ZONES.map((z) => <option key={z} value={z}>{LIBELLES_ZONE[z]}</option>)}
            </select>
            <select className={s.choix} aria-label={tp.filtreStatut} value={statut} onChange={(e) => setStatut(e.target.value as StatutProspect | '')}>
              <option value="">{tp.filtreStatut}</option>
              {STATUTS_PROSPECT.map((x) => <option key={x} value={x}>{tp.statuts[x]}</option>)}
            </select>
            <label className={`${p.ligne} ${ui.corps}`}>
              <input type="checkbox" checked={avecEmail} onChange={(e) => setAvecEmail(e.target.checked)} />
              {tp.avecEmailSeulement}
            </label>
          </div>

          <div className={s.defilement}>
            <table className={s.tableau}>
              <thead>
                <tr>
                  <th scope="col">{textesEcrans.resto.admin.colonnes.etablissement}</th>
                  <th scope="col"><Phone size={14} aria-hidden /> {tp.colonnes.telephone}</th>
                  <th scope="col"><Mail size={14} aria-hidden /> {tp.colonnes.email}</th>
                  <th scope="col">{tp.colonnes.statut}</th>
                  <th scope="col">{tp.colonnes.dernierEnvoi}</th>
                </tr>
              </thead>
              <tbody>
                {filtrees.slice(0, 500).map((x) => (
                  <tr key={x.id}>
                    <th scope="row" className={s.cellTexte}>
                      {x.site ? <a href={x.site} target="_blank" rel="noreferrer" className={ui.lienDiscret}>{x.nom}</a> : x.nom}
                      <span className={s.sousLigne}>
                        {LIBELLES_CATEGORIE_PROSPECT[x.categorie]} · {x.commune ?? (zoneDuLieu(null, x.lat, x.lng) ? LIBELLES_ZONE[zoneDuLieu(null, x.lat, x.lng)!] : '–')}
                      </span>
                    </th>
                    <td>{x.telephone ? <a href={`tel:${x.telephone.replace(/\s/g, '')}`} className={ui.lienDiscret}>{x.telephone}</a> : '–'}</td>
                    <td className={s.cellTexte}><CelluleEmail prospect={x} onModifie={() => void charger()} /></td>
                    <td>
                      <select className={s.choix} aria-label={`Statut de ${x.nom}`} value={x.statut} onChange={(e) => void changerStatut(x, e.target.value as StatutProspect)}>
                        {STATUTS_PROSPECT.map((v) => <option key={v} value={v}>{tp.statuts[v]}</option>)}
                      </select>
                    </td>
                    <td>{x.dernierEnvoi ? date(x.dernierEnvoi) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={lancer} className={`${s.carte} ${s.campagne}`} aria-labelledby="campagne">
            <h2 id="campagne" className={`${p.ligne} ${ui.sousTitre}`}>
              <Send size={20} strokeWidth={2} aria-hidden />
              {tp.campagne}
            </h2>
            <p className={`${ui.legende} ${ui.galet}`}>{tp.campagneAide}</p>
            <label className={s.bloc}>
              <span className={ui.corpsFort}>{tp.sujet}</span>
              <span className={ui.champ}><input value={sujet} maxLength={150} onChange={(e) => setSujet(e.target.value)} /></span>
            </label>
            <label className={s.bloc}>
              <span className={ui.corpsFort}>{tp.message}</span>
              <textarea className={s.zoneTexte} value={message} maxLength={5000} rows={14} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <p className={ui.corpsFort}>{tp.destinataires(destinataires.length)}</p>
            <button type="submit" className={ui.boutonPrincipal} disabled={envoi.enCours || destinataires.length === 0 || sujet.trim().length < 3 || message.trim().length < 20}>
              {envoi.enCours && <Spinner />}
              {tp.envoyer(destinataires.length)}
            </button>
            {envoi.texte && <p className={ui.corps} role="status">{envoi.texte}</p>}
          </form>
        </>
      )}

      {campagnes.length > 0 && (
        <section className={p.section} aria-labelledby="campagnes">
          <h2 id="campagnes" className={ui.sousTitre}>{tp.campagnes}</h2>
          <ul className={p.liste}>
            {campagnes.map((c) => (
              <li key={c.id} className={`${s.carte} ${s.campagneLigne}`}>
                <span className={ui.corpsFort}>{c.sujet}</span>
                <span className={`${ui.legende} ${ui.galet}`}>
                  {date(c.creeLe)} · {tp.avancement(c.envoyes, c.total)}
                  {c.enAttente > 0 && ` · ${tp.attente(c.enAttente)}`}
                  {c.echecs > 0 && ` · ${tp.echecs(c.echecs)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
