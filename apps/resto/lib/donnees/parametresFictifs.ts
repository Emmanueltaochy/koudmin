import type { ParametresTarifaires } from '@kivien/core';

/** Paramètres de démonstration, identiques à supabase/seed.sql (SMIC 2026). Données fictives uniquement. */
export const PARAMETRES_FICTIFS: ParametresTarifaires = {
  dateEffet: '2026-11-15',
  tauxHoraireBrutCentimes: 1231,
  fraisMiseEnRelationHTCentimes: 0,
  fraisHoraireHTCentimes: 350,
  dureeMinimumMinutes: 120,
  tvaPourMille: 85,
};
