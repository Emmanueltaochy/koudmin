import type { ParametresTarifaires } from '@kivien/core';

/** Paramètres de démonstration, identiques à supabase/seed.sql (SMIC 2026). Données fictives uniquement. */
export const PARAMETRES_FICTIFS: ParametresTarifaires = {
  dateEffet: '2026-01-01',
  tauxHoraireBrutCentimes: 1231,
  fraisMiseEnRelationHTCentimes: 1900,
  tvaPourMille: 85,
};
