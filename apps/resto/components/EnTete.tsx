'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2,
  CalendarDays,
  FileText,
  History,
  House,
  LogOut,
  Menu,
  Search,
  Star,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { textesEcrans } from '@kivien/core';
import { deconnecter } from '@/lib/auth';
import { choisirEtablissement, donneesFictives } from '@/lib/donnees';
import { useDonnees } from '@/lib/useDonnees';
import { Cloche } from './Cloche';
import s from './EnTete.module.css';

const tm = textesEcrans.resto.menu;

interface Lien {
  href: string;
  libelle: string;
  icone: LucideIcon;
  gerant?: boolean;
}

/** Menu en trois temps : agir, suivre, gérer. */
const GROUPES: { titre: string; liens: Lien[] }[] = [
  {
    titre: tm.quotidien,
    liens: [
      { href: '/espace', libelle: tm.accueil, icone: House },
      { href: '/demande', libelle: tm.demander, icone: Search },
      { href: '/planning', libelle: tm.planning, icone: CalendarDays },
    ],
  },
  {
    titre: tm.suivi,
    liens: [
      { href: '/historique', libelle: tm.demandes, icone: History },
      { href: '/historique?onglet=favoris', libelle: tm.favoris, icone: Star },
      { href: '/historique?onglet=factures', libelle: tm.factures, icone: FileText, gerant: true },
    ],
  },
  {
    titre: tm.gestion,
    liens: [
      { href: '/etablissements', libelle: tm.etablissements, icone: Building2 },
      { href: '/utilisateurs', libelle: tm.utilisateurs, icone: Users },
      { href: '/compte', libelle: tm.monCompte, icone: UserCog },
    ],
  },
];

function estActif(href: string, chemin: string, onglet: string | null) {
  const [base, requete] = href.split('?');
  if (base !== chemin) return false;
  const ongletLien = requete ? new URLSearchParams(requete).get('onglet') : null;
  return base !== '/historique' || ongletLien === onglet;
}

/**
 * Navigation de l'espace : menu à gauche sur grand écran (missions, puis compte), en-tête avec
 * menu déroulant sur mobile. Le choix de l'établissement recharge les écrans ouverts.
 */
export function EnTete() {
  const chemin = usePathname();
  const onglet = useSearchParams().get('onglet');
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();
  const { etat } = useDonnees(async (src) => {
    const [liste, courant] = await Promise.all([src.etablissements(), src.restaurant()]);
    return { liste, courant };
  });
  const donnees = etat.statut === 'pret' ? etat.donnees : null;
  const gerant = donnees?.courant.role === 'gerant';

  const sortir = async () => {
    await deconnecter();
    router.replace('/connexion');
  };

  useEffect(() => setOuvert(false), [chemin, onglet]);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [ouvert]);

  const choix = (idSuffixe: string) =>
    donnees && (
      <div className={s.etablissement}>
        <label htmlFor={`etablissement-${idSuffixe}`} className={s.etiquette}>
          {tm.etablissement}
        </label>
        {donnees.liste.length > 1 ? (
          <select
            id={`etablissement-${idSuffixe}`}
            className={s.selecteur}
            value={donnees.courant.id}
            onChange={(e) => choisirEtablissement(e.target.value)}
          >
            {donnees.liste.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        ) : (
          <span id={`etablissement-${idSuffixe}`} className={s.nomEtablissement}>
            {donnees.courant.nom}
          </span>
        )}
      </div>
    );

  const liens = (groupe: Lien[], classe: string | undefined) =>
    groupe
      .filter((l) => !l.gerant || gerant)
      .map((l) => (
        <Link key={l.href} href={l.href} className={classe} aria-current={estActif(l.href, chemin, onglet) ? 'page' : undefined}>
          <l.icone size={20} strokeWidth={2} aria-hidden />
          {l.libelle}
        </Link>
      ));

  const contenu = (idSuffixe: string, classe: string | undefined) => (
    <>
      {choix(idSuffixe)}
      {GROUPES.map((g) => (
        <div key={g.titre} className={s.bloc}>
          <p className={s.groupe}>{g.titre}</p>
          {liens(g.liens, classe)}
        </div>
      ))}
      {!donneesFictives && (
        <button type="button" className={classe} onClick={sortir}>
          <LogOut size={20} strokeWidth={2} aria-hidden />
          {textesEcrans.connexion.deconnexion}
        </button>
      )}
    </>
  );

  return (
    <>
      <header className={s.entete}>
        <Link href="/espace" className={s.marque} aria-label="Kivien, accueil">
          {/* Logo pilule basalte : version de l'application (le bouton d'action reste le seul piment). */}
          <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" className={s.logo} />
        </Link>
        <button
          type="button"
          className={s.boutonMenu}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOuvert((o) => !o)}
        >
          {ouvert ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
        </button>
        {ouvert && (
          <nav id="menu-mobile" aria-label="Navigation principale" className={s.panneau}>
            {contenu('mobile', s.lienPanneau)}
          </nav>
        )}
      </header>
      {/* Une seule cloche : à gauche du menu sur mobile, en haut à droite sur grand écran. */}
      <div className={s.cloche}>
        <Cloche />
      </div>
      <nav aria-label="Navigation principale" className={s.lateral}>
        <Link href="/espace" className={s.marque} aria-label="Kivien, accueil">
          <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" className={s.logo} />
        </Link>
        {contenu('large', s.lien)}
      </nav>
    </>
  );
}
