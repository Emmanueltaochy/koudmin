'use client';

import { useParams } from 'next/navigation';
import { formatEuros, formatHT, textesEcrans, totauxFacture } from '@kivien/core';
import ui from '@/components/ui.module.css';
import { IDENTITE_KIVIEN, libelleMois } from '@/lib/identite';
import { useDonnees } from '@/lib/useDonnees';
import s from './facture.module.css';

/** Facture mensuelle imprimable (« Imprimer » → PDF depuis le navigateur). */
export default function Facture() {
  const { mois } = useParams<{ mois: string }>();
  const { etat } = useDonnees(async (src) => {
    const [factures, restaurant] = await Promise.all([src.factures(), src.restaurant()]);
    return { facture: factures.find((f) => f.mois === mois) ?? null, restaurant };
  }, [mois]);

  if (etat.statut !== 'pret') return <div className={s.page} aria-busy />;
  const { facture: f, restaurant } = etat.donnees;
  if (!f) return <div className={s.page}><p className={ui.sousTitre}>{textesEcrans.resto.historique.aucuneFacture}</p></div>;
  const unitaire = f.montantHTCentimes / f.misesEnRelation;
  const tot = totauxFacture(f.misesEnRelation, unitaire, f.tauxTVA);
  const tva = `${Math.floor(f.tauxTVA / 10)},${f.tauxTVA % 10}`;

  return (
    <div className={s.page}>
      <div className={s.actions}>
        <button type="button" className={ui.boutonSecondaire} onClick={() => window.print()}>
          {textesEcrans.resto.historique.imprimer}
        </button>
      </div>
      <article className={s.facture}>
        <header className={s.entete}>
          <div>
            <img src="/brand/logo-pilule-basalte.svg" alt="Kivien" width={96} style={{ height: "auto", marginBottom: 8 }} />
            <p className={ui.legende}>{IDENTITE_KIVIEN.raisonSociale}</p>
            <p className={ui.legende}>{IDENTITE_KIVIEN.adresse}</p>
            <p className={ui.legende}>SIRET {IDENTITE_KIVIEN.siret}</p>
            {IDENTITE_KIVIEN.tvaIntracom && <p className={ui.legende}>TVA {IDENTITE_KIVIEN.tvaIntracom}</p>}
          </div>
          <div className={s.droite}>
            <p className={ui.sousTitre}>Facture {f.numero}</p>
            <p className={ui.legende}>Période : {libelleMois(f.mois)}</p>
            <p className={ui.legende}>Paiement à {IDENTITE_KIVIEN.delaiPaiementJours} jours</p>
          </div>
        </header>

        <section>
          <p className={ui.legende}>Facturé à</p>
          <p className={ui.corpsFort}>{restaurant.nom}</p>
          {restaurant.adresse && <p className={ui.corps}>{restaurant.adresse.libelle}</p>}
        </section>

        <table className={s.tableau}>
          <thead>
            <tr>
              <th scope="col">Désignation</th>
              <th scope="col">Quantité</th>
              <th scope="col">Prix unitaire HT</th>
              <th scope="col">Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mise en relation avec un extra ({libelleMois(f.mois)})</td>
              <td>{f.misesEnRelation}</td>
              <td>{formatHT(unitaire)}</td>
              <td>{formatHT(tot.htCentimes)}</td>
            </tr>
          </tbody>
        </table>

        <dl className={s.totaux}>
          <div>
            <dt>Total HT</dt>
            <dd>{formatEuros(tot.htCentimes)}</dd>
          </div>
          <div>
            <dt>TVA {tva} %</dt>
            <dd>{formatEuros(tot.tvaCentimes)}</dd>
          </div>
          <div className={s.ttc}>
            <dt>Total TTC</dt>
            <dd>{formatEuros(tot.ttcCentimes)}</dd>
          </div>
        </dl>

        <p className={ui.legende}>
          Mise en relation non facturée si l’extra est absent et non remplacé. Les salaires sont versés directement par
          vous aux extras et ne figurent pas sur cette facture. En cas de retard de paiement : pénalités au taux légal et
          indemnité forfaitaire de 40 € pour frais de recouvrement.
        </p>
      </article>
    </div>
  );
}
