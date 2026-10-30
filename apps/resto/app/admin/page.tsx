'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { BarChart3, Building2, ClipboardList, LogOut, MapPinned, Users, type LucideIcon } from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import p from '@/components/pages.module.css';
import { Spinner } from '@/components/Spinner';
import ui from '@/components/ui.module.css';
import { connecte, connecterAdmin, deconnecter } from '@/lib/auth';
import { source } from '@/lib/donnees';
import { ListeDemandes, ListeEtablissements, ListeExtras } from './Listes';
import { Recrutement } from './Recrutement';
import { VueEnsemble } from './VueEnsemble';
import s from './admin.module.css';

const ta = textesEcrans.resto.admin;

type Onglet = 'vue' | 'demandes' | 'extras' | 'etablissements' | 'recrutement';
/** Menu de gauche : piloter (chiffres), suivre l'activité, développer le réseau. */
const GROUPES: { titre: string; onglets: { id: Onglet; icone: LucideIcon }[] }[] = [
  { titre: ta.groupes.pilotage, onglets: [{ id: 'vue', icone: BarChart3 }] },
  { titre: ta.groupes.activite, onglets: [{ id: 'demandes', icone: ClipboardList }] },
  {
    titre: ta.groupes.reseau,
    onglets: [
      { id: 'extras', icone: Users },
      { id: 'etablissements', icone: Building2 },
      { id: 'recrutement', icone: MapPinned },
    ],
  },
];

/** Connexion des administrateurs par e-mail (comptes créés avec deploy/vps/creer-admin.sh). */
function Connexion({ onConnecte }: { onConnecte: () => void }) {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await connecterAdmin(email, motDePasse);
      if (r === 'ok') return onConnecte();
      setErreur(r === 'attente' ? textesEcrans.connexion.tropDEssais : ta.erreurIdentifiants);
    } catch {
      setErreur(textesEcrans.connexion.pasDeReseau);
    }
    setEnvoi(false);
  }

  return (
    <form onSubmit={soumettre} className={s.connexion} noValidate>
      <div className={p.intro}>
        <h1 className={ui.titre}>{ta.connexionTitre}</h1>
        <p className={`${ui.corps} ${ui.galet}`}>{ta.connexionTexte}</p>
      </div>
      <label className={s.bloc}>
        <span className={ui.corpsFort}>{ta.email}</span>
        <span className={ui.champ}>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={envoi} />
        </span>
      </label>
      <label className={s.bloc}>
        <span className={ui.corpsFort}>{ta.motDePasse}</span>
        <span className={ui.champ} data-erreur={!!erreur}>
          <input
            id="admin-mot-de-passe"
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            disabled={envoi}
          />
        </span>
      </label>
      {erreur && (
        <p className={ui.messageErreur} role="alert">
          {erreur}
        </p>
      )}
      <button type="submit" className={ui.boutonPrincipal} aria-busy={envoi} disabled={envoi}>
        {envoi && <Spinner />}
        {ta.seConnecter}
      </button>
    </form>
  );
}

/** Espace administrateur de la plateforme : demande, offre, valeur, listes et recrutement. */
export default function Admin() {
  const [etat, setEtat] = useState<'verification' | 'connexion' | 'refuse' | 'pret'>('verification');
  const [onglet, setOnglet] = useState<Onglet>('vue');

  async function verifier() {
    if (!(await connecte())) return setEtat('connexion');
    const tableau = await source().admin.tableau(1).catch(() => null);
    setEtat(tableau ? 'pret' : 'refuse');
  }
  useEffect(() => {
    void verifier();
  }, []);

  const sortir = async () => {
    await deconnecter();
    setEtat('connexion');
  };

  return (
    <div className={s.cadre}>
      <header className={s.tete}>
        <a href="/" aria-label="Kivien" className={s.marque}>
          <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={88} style={{ height: 'auto' }} />
        </a>
        <span className={s.espace}>{ta.espace}</span>
        {(etat === 'pret' || etat === 'refuse') && (
          <button type="button" className={s.sortir} onClick={() => void sortir()}>
            <LogOut size={18} strokeWidth={2} aria-hidden />
            {ta.deconnexion}
          </button>
        )}
      </header>

      {etat === 'verification' && <div className={p.squelette} aria-busy />}
      {etat === 'connexion' && <Connexion onConnecte={() => void verifier()} />}
      {etat === 'refuse' && <p className={p.vide}>{ta.reserve}</p>}
      {etat === 'pret' && (
        <>
          <div className={s.disposition}>
          <nav className={s.onglets} aria-label={ta.espace}>
            {GROUPES.map((g) => (
              <div key={g.titre} className={s.groupe}>
                <span className={s.groupeTitre}>{g.titre}</span>
                {g.onglets.map(({ id, icone: Icone }) => (
                  <button key={id} type="button" className={s.onglet} aria-current={onglet === id ? 'page' : undefined} onClick={() => setOnglet(id)}>
                    <Icone size={18} strokeWidth={2} aria-hidden />
                    {ta.onglets[id]}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <main className={s.contenu}>
            <h1 className={ui.titre}>{ta.onglets[onglet]}</h1>
            {onglet === 'vue' && <VueEnsemble />}
            {onglet === 'demandes' && <ListeDemandes />}
            {onglet === 'extras' && <ListeExtras />}
            {onglet === 'etablissements' && <ListeEtablissements />}
            {onglet === 'recrutement' && <Recrutement />}
          </main>
          </div>
        </>
      )}
    </div>
  );
}
