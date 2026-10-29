'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { dateLongue, formatPlage, textes as t, textesEcrans } from '@koudmin/core';
import { CarteDemande } from '@/components/CarteDemande';
import p from '@/components/pages.module.css';
import ui from '@/components/ui.module.css';
import { aVenir, extrasActifs, phaseDemande } from '@/lib/phase';
import { useDonnees } from '@/lib/useDonnees';

const ta = textesEcrans.resto.accueil;

export default function Accueil() {
  const { etat } = useDonnees(async (s) => {
    const [restaurant, demandes] = await Promise.all([s.restaurant(), s.demandes()]);
    return { restaurant, demandes };
  });

  if (etat.statut !== 'pret') {
    return (
      <div className={p.page} aria-busy={etat.statut === 'chargement'}>
        {etat.statut === 'erreur' ? (
          <p className={`${ui.sousTitre} ${ui.braise}`}>{t.extra.missions.horsLigneTitre}</p>
        ) : (
          <>
            <div className={p.squelette} />
            <div className={p.squelette} />
          </>
        )}
      </div>
    );
  }

  const { restaurant, demandes } = etat.donnees;
  const enCours = demandes
    .filter(aVenir)
    .sort((a, b) => a.jour.localeCompare(b.jour) || a.debut - b.debut);
  const aNoter = demandes.filter((d) => phaseDemande(d) === 'aNoter');

  return (
    <div className={p.page}>
      <h1 className={ui.titre}>{restaurant.nom}</h1>

      <div className={p.deuxColonnes}>
        <section className={p.section} aria-labelledby="en-cours">
          <h2 id="en-cours" className={ui.sousTitre}>
            {ta.enCours}
          </h2>
          {enCours.length === 0 ? (
            <p className={p.vide}>{ta.aucuneEnCours}</p>
          ) : (
            <ul className={`${p.liste} ${p.grilleCartes}`}>
              {enCours.map((d) => (
                <li key={d.id}>
                  <CarteDemande demande={d} />
                </li>
              ))}
            </ul>
          )}

          {aNoter.length > 0 && (
            <>
              <h2 className={ui.sousTitre} style={{ marginTop: 16 }}>
                {ta.aNoter}
              </h2>
              <ul className={p.liste}>
                {aNoter.flatMap((d) =>
                  extrasActifs(d)
                    .filter((e) => !e.notation)
                    .map((e) => (
                      <li key={e.affectationId}>
                        <Link href={`/demandes/${d.id}/notation?affectation=${e.affectationId}`} className={p.carteLien}>
                          <div className={p.entreDeux}>
                            <span className={ui.corpsFort}>
                              {e.prenom} {e.nom}
                            </span>
                            <span className={`${p.ligne} ${ui.legendeForte}`}>
                              <Star size={16} strokeWidth={2} aria-hidden />
                              {ta.noter}
                            </span>
                          </div>
                          <span className={ui.legende}>
                            {dateLongue(d.jour)} · {formatPlage(d.debut, d.fin)}
                          </span>
                        </Link>
                      </li>
                    )),
                )}
              </ul>
            </>
          )}
        </section>

        <aside className={p.carteAppel} aria-labelledby="besoin">
          <h2 id="besoin" className={ui.sousTitre}>
            {ta.besoin}
          </h2>
          <p className={`${ui.corps} ${ui.galet}`}>{t.resto.demande.sousTitre}</p>
          <Link href="/demande" className={ui.boutonPrincipal}>
            {t.resto.demande.envoyer}
          </Link>
        </aside>
      </div>
    </div>
  );
}
