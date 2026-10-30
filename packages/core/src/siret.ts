/**
 * Numéro SIRET : 14 chiffres, clé de Luhn. Exception La Poste (SIREN 356 000 000) :
 * la somme des chiffres doit être un multiple de 5. Même règle que siret_valide() en base.
 */
export function normaliserSiret(saisie: string): string {
  return saisie.replace(/\D/g, '');
}

export function siretValide(saisie: string): boolean {
  const s = normaliserSiret(saisie);
  if (!/^\d{14}$/.test(s)) return false;
  const chiffres = [...s].map(Number);
  if (s.startsWith('356000000')) return chiffres.reduce((a, b) => a + b, 0) % 5 === 0;
  const somme = chiffres.reduce((total, c, i) => {
    // Depuis la droite, un chiffre sur deux est doublé (positions paires).
    const double = (14 - i) % 2 === 0;
    const v = double ? c * 2 : c;
    return total + (v > 9 ? v - 9 : v);
  }, 0);
  return somme % 10 === 0;
}

/** « 73282932000074 » → « 732 829 320 00074 » (SIREN puis NIC). */
export function formatSiret(saisie: string): string {
  const s = normaliserSiret(saisie);
  return [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9), s.slice(9, 14)].filter(Boolean).join(' ');
}
