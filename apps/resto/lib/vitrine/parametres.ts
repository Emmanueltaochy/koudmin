import { aujourdhuiReunion, parametresEnVigueur, type ParametresTarifaires } from '@kivien/core';
import { PARAMETRES_FICTIFS } from '../donnees/parametresFictifs';

type Ligne = {
  date_effet: string;
  taux_horaire_brut_centimes: number;
  frais_mise_en_relation_ht_centimes: number;
  tva_pour_mille: number;
};

/**
 * Taux horaire (SMIC) et frais en vigueur pour la page d'accueil, lus côté serveur dans la table
 * `parametres` (lecture publique). Sans Supabase configuré : paramètres de démonstration.
 * En cas d'échec, on lève une erreur plutôt que d'afficher un taux faux : la page déjà générée
 * reste servie jusqu'à la prochaine régénération réussie.
 */
export async function parametresPublics(): Promise<ParametresTarifaires> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) return PARAMETRES_FICTIFS;

  const reponse = await fetch(
    `${url}/rest/v1/parametres?select=date_effet,taux_horaire_brut_centimes,frais_mise_en_relation_ht_centimes,tva_pour_mille`,
    { headers: { apikey: cle, Authorization: `Bearer ${cle}` }, next: { revalidate: 3600 } },
  );
  if (!reponse.ok) throw new Error(`Paramètres tarifaires illisibles (HTTP ${reponse.status})`);
  const lignes = (await reponse.json()) as Ligne[];
  return parametresEnVigueur(
    lignes.map((l) => ({
      dateEffet: l.date_effet as ParametresTarifaires['dateEffet'],
      tauxHoraireBrutCentimes: l.taux_horaire_brut_centimes,
      fraisMiseEnRelationHTCentimes: l.frais_mise_en_relation_ht_centimes,
      tvaPourMille: l.tva_pour_mille,
    })),
    aujourdhuiReunion(),
  );
}
