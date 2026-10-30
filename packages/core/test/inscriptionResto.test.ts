import { describe, expect, it } from 'vitest';
import {
  DEFINITION_SECTEURS,
  formatSiret,
  LIBELLES_POSTE,
  normaliserSiret,
  POSTES,
  postesDuSecteur,
  SECTEURS,
  siretValide,
  validerInscriptionResto,
} from '../src';

describe('SIRET', () => {
  it('accepte les numéros dont la clé de Luhn est juste', () => {
    expect(siretValide('73282932000074')).toBe(true);
    expect(siretValide('732 829 320 00074')).toBe(true);
    expect(siretValide('44306184100047')).toBe(true);
  });
  it('refuse un chiffre faux, une longueur fausse', () => {
    expect(siretValide('73282932000075')).toBe(false);
    expect(siretValide('7328293200007')).toBe(false);
    expect(siretValide('')).toBe(false);
  });
  it('applique la règle particulière de La Poste', () => {
    expect(siretValide('35600000000042')).toBe(true); // somme des chiffres : 20
    expect(siretValide('35600000000043')).toBe(false); // somme : 21
  });
  it('formate et nettoie la saisie', () => {
    expect(normaliserSiret(' 732-829-320 00074 ')).toBe('73282932000074');
    expect(formatSiret('73282932000074')).toBe('732 829 320 00074');
  });
});

describe('inscription restaurateur', () => {
  const ok = { etablissement: 'Le Boucan Grillé', secteur: 'hotellerie_restauration', adresseChoisie: true, siret: '73282932000074', telephone: '0692 12 34 56', email: 'contact@boucan.re', motDePasse: 'kivien974' };
  it('accepte une saisie complète', () => {
    expect(validerInscriptionResto(ok)).toEqual({});
  });
  it('signale chaque champ manquant ou faux', () => {
    const e = validerInscriptionResto({ etablissement: ' ', secteur: 'garage', adresseChoisie: false, siret: '123', telephone: '0612345678', email: 'pas-une-adresse', motDePasse: 'court' });
    expect(Object.keys(e)).toEqual(['etablissement', 'secteur', 'adresseChoisie', 'siret', 'telephone', 'email', 'motDePasse']);
  });
  it('ne redemande pas mobile et mot de passe quand le compte est déjà ouvert', () => {
    expect(validerInscriptionResto({ ...ok, telephone: '', email: '', motDePasse: '' }, true)).toEqual({});
  });
});

describe('secteurs du contrat d’extra', () => {
  it('chaque métier appartient à au moins un secteur, chaque secteur a des métiers', () => {
    const couverts = new Set(SECTEURS.flatMap((s) => postesDuSecteur(s)));
    expect([...couverts].sort()).toEqual([...POSTES].sort());
    for (const s of SECTEURS) expect(postesDuSecteur(s).length).toBeGreaterThan(0);
  });
  it('a un libellé pour chaque métier et chaque secteur', () => {
    for (const p of POSTES) expect(LIBELLES_POSTE[p].court).toBeTruthy();
    for (const s of SECTEURS) expect(DEFINITION_SECTEURS[s].libelle).toBeTruthy();
  });
  it('reste aligné sur la fonction SQL postes_du_secteur()', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const dossier = new URL('../../../supabase/migrations/', import.meta.url);
    const sql = readdirSync(dossier)
      .map((f) => readFileSync(new URL(f, dossier), 'utf8'))
      .join('\n');
    for (const s of SECTEURS) {
      const ligne = sql.match(new RegExp(`when '${s}' then array\\[([^\\]]*)\\]`));
      expect(ligne, s).not.toBeNull();
      const postes = [...ligne![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
      expect(postes, s).toEqual([...postesDuSecteur(s)]);
    }
  });
});
