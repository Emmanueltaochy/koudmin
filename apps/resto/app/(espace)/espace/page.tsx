'use client';

import Link from 'next/link';
import { CalendarCheck, Check, ClipboardList, PenLine, Star, Users, type LucideIcon } from 'lucide-react';
import { aujourdhuiReunion, dateLongue, etiquetteJour, formatPlage, libellePoste, minuteReunion, textes as t, textesEcrans } from '@kivien/core';
import { AvatarExtra } from '@/components/AvatarExtra';
import { CarteDemande } from '@/components/CarteDemande';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { aVenir, extrasActifs, phaseDemande } from '@/lib/phase';
import { useDonnees } from '@/lib/useDonnees';
import s from './accueil.module.css';

const ta = textesEcrans.resto.accueil;

/** Visuel du haut de l'accueil selon le secteur (visuels de travail, à remplacer par des photos sous licence). */
const PHOTO_SECTEUR: Partial<Record<string, string>> = {
  hotellerie_restauration: '/vitrine/cuisine.jpg',
  loisirs_vacances: '/vitrine/salle.jpg',
};

function Chiffre({ icone: Icone, valeur, libelle, teinte }: { icone: LucideIcon; valeur: number; libelle: string; teinte: string }) {
  return (
    <div className={s.chiffre}>
      <span className={s.iconeChiffre} data-teinte={teinte} aria-hidden>
        <Icone size={20} strokeWidth={2} />
      </span>
      <span className={s.valeur}>{valeur}</span>
      <span className={ui.legende}>{libelle}</span>
    </div>
  );
}

export default function Accueil() {
  const { etat } = useDonnees(async (src) => {
    const [restaurant, demandes] = await Promise.all([src.restaurant(), src.demandes()]);
    return { restaurant, demandes };
  });

  if (etat.statut !== 'pret') {
    return (
      <div className={p.page} aria-busy={etat.statut === 'chargement'}>
        {etat.statut === 'erreur' ? (
          <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p>
        ) : (
          <>
            <div className={`${p.squelette} ${s.squeletteBandeau}`} />
            <div className={p.squelette} />
          </>
        )}
      </div>
    );
  }

  const { restaurant, demandes } = etat.donnees;
  const aujourdhui = aujourdhuiReunion();
  const enCours = demandes.filter(aVenir).sort((a, b) => a.jour.localeCompare(b.jour) || a.debut - b.debut);
  const aNoter = demandes.filter((d) => phaseDemande(d) === 'aNoter');
  const attendusAujourdhui = demandes
    .filter((d) => d.jour === aujourdhui && d.statut !== 'annulee')
    .flatMap((d) => extrasActifs(d).map((e) => ({ e, d })));
  const venusCeMois = demandes
    .filter((d) => d.jour.slice(0, 7) === aujourdhui.slice(0, 7) && d.jour <= aujourdhui)
    .flatMap((d) => extrasActifs(d).filter((e) => e.statut === 'terminee' || e.statut === 'confirmee')).length;
  const aNoterNombre = aNoter.flatMap((d) => extrasActifs(d).filter((e) => !e.notation)).length;
  const photo = PHOTO_SECTEUR[restaurant.secteur];
  // Extras qui ont dit « mi lé la » sur une mission à venir et dont le contrat attend la signature de l'établissement.
  const trouves = demandes
    .filter((d) => ['recherche', 'pourvue'].includes(phaseDemande(d)))
    .flatMap((d) => extrasActifs(d).filter((e) => !e.contratSigneRestaurant).map((e) => ({ e, d })))
    .sort((a, b) => b.e.confirmeLe.localeCompare(a.e.confirmeLe));

  return (
    <div className={p.page}>
      <section className={s.bandeau} data-photo={photo ? 'true' : undefined} style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
        <div className={s.voile}>
          <p className={s.salut}>
            {minuteReunion() >= 17 * 60 ? ta.bonsoir : ta.bonjour} · {dateLongue(aujourdhui)}
          </p>
          <h1 className={s.nom}>{restaurant.nom}</h1>
          {attendusAujourdhui.length > 0 && (
            <div className={s.attendus}>
              <div className={s.avatars}>
                {attendusAujourdhui.slice(0, 4).map(({ e }) => (
                  <AvatarExtra key={e.affectationId} extraId={e.extraId} prenom={e.prenom} nom={e.nom} alt={e.prenom} taille={36} />
                ))}
              </div>
              <span>
                {attendusAujourdhui.map(({ e, d }) => `${e.prenom} ${formatPlage(d.debut, d.fin)}`).join(' · ')}
              </span>
            </div>
          )}
          <Link href="/demande" className={`${ui.boutonPrincipal} ${s.action}`}>
            {t.resto.demande.envoyer}
          </Link>
        </div>
      </section>

      {trouves.length > 0 && (
        <section className={s.trouves} aria-labelledby="extras-trouves">
          <h2 id="extras-trouves" className={s.trouvesTitre}>
            <span className={s.coche} aria-hidden>
              <Check size={20} strokeWidth={3} />
            </span>
            {ta.trouves(trouves.length)}
          </h2>
          <ul className={s.trouvesListe}>
            {trouves.map(({ e, d }) => (
              <li key={e.affectationId} className={s.trouve}>
                <AvatarExtra extraId={e.extraId} prenom={e.prenom} nom={e.nom} alt={e.prenom} taille={56} />
                <div className={s.trouveTexte}>
                  <span className={s.trouveNom}>{ta.aDitMiLeLa(e.prenom)}</span>
                  <span className={ui.legende}>
                    {libellePoste(d.poste, d.intitule, 'court')} · {etiquetteJour(d.jour, d.debut, aujourdhui).texte} · {formatPlage(d.debut, d.fin)}
                  </span>
                </div>
                <Link href={`/demandes/${d.id}/contrat?affectation=${e.affectationId}`} className={s.signer}>
                  <PenLine size={18} strokeWidth={2} aria-hidden />
                  {ta.signerContrat}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={s.chiffres}>
        <Chiffre icone={Users} valeur={attendusAujourdhui.length} libelle={ta.aujourdhui} teinte="vacoa" />
        <Chiffre icone={ClipboardList} valeur={enCours.length} libelle={ta.enCoursCourt} teinte="curcuma" />
        <Chiffre icone={Star} valeur={aNoterNombre} libelle={ta.aNoterCourt} teinte="curcuma" />
        <Chiffre icone={CalendarCheck} valeur={venusCeMois} libelle={ta.ceMois} teinte="basalte" />
      </div>

      <section className={p.section} aria-labelledby="en-cours">
        <h2 id="en-cours" className={ui.sousTitre}>
          {ta.enCours}
        </h2>
        {enCours.length === 0 ? (
          <div className={s.vide}>
            <img src="/vitrine/salle.jpg" alt="" className={s.videPhoto} />
            <div className={s.videTexte}>
              <p className={ui.sousTitre}>{ta.videTitre}</p>
              <p className={`${ui.corps} ${ui.galet}`}>{ta.videTexte}</p>
            </div>
          </div>
        ) : (
          <ul className={`${p.liste} ${p.grilleCartes}`}>
            {enCours.map((d) => (
              <li key={d.id}>
                <CarteDemande demande={d} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {aNoter.length > 0 && (
        <section className={p.section} aria-labelledby="a-noter">
          <h2 id="a-noter" className={ui.sousTitre}>
            {ta.aNoter}
          </h2>
          <ul className={`${p.liste} ${p.grilleCartes}`}>
            {aNoter.flatMap((d) =>
              extrasActifs(d)
                .filter((e) => !e.notation)
                .map((e) => (
                  <li key={e.affectationId}>
                    <Link href={`/demandes/${d.id}/notation?affectation=${e.affectationId}`} className={`${p.carteLien} ${s.carteNoter}`}>
                      <AvatarExtra extraId={e.extraId} prenom={e.prenom} nom={e.nom} alt={e.prenom} taille={44} />
                      <div className={s.noterTexte}>
                        <span className={ui.corpsFort}>
                          {e.prenom} {e.nom}
                        </span>
                        <span className={ui.legende}>
                          {dateLongue(d.jour)} · {formatPlage(d.debut, d.fin)}
                        </span>
                      </div>
                      <span className={`${p.ligne} ${ui.legendeForte}`}>
                        <Star size={16} strokeWidth={2} aria-hidden />
                        {ta.noter}
                      </span>
                    </Link>
                  </li>
                )),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
