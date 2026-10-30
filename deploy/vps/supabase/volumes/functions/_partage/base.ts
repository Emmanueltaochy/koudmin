// Accès à la base par l'API REST de Supabase (PostgREST), sans SDK.
// Clé de service : contourne les règles d'accès, réservée aux fonctions serveur.

export function base(url: string, cle: string, jetonUtilisateur?: string, f: typeof fetch = fetch) {
  const entetes = (extra: Record<string, string> = {}) => ({
    apikey: cle,
    Authorization: `Bearer ${jetonUtilisateur ?? cle}`,
    'Content-Type': 'application/json',
    ...extra,
  });
  async function lire<T>(r: Response): Promise<T> {
    const texte = await r.text();
    if (!r.ok) throw new Error(`Base ${r.status} : ${texte.slice(0, 300)}`);
    return (texte ? JSON.parse(texte) : null) as T;
  }
  return {
    rpc<T>(nom: string, args: Record<string, unknown> = {}): Promise<T> {
      return f(`${url}/rest/v1/rpc/${nom}`, { method: 'POST', headers: entetes(), body: JSON.stringify(args) }).then(lire<T>);
    },
    /** `requete` : syntaxe PostgREST, ex. « select=*&restaurant_id=eq.… ». */
    lire<T>(table: string, requete: string): Promise<T[]> {
      return f(`${url}/rest/v1/${table}?${requete}`, { headers: entetes() }).then(lire<T[]>);
    },
    /** Insertion ; null si la ligne existe déjà (contrainte d'unicité). */
    async inserer<T>(table: string, ligne: Record<string, unknown>): Promise<T | null> {
      const r = await f(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: entetes({ Prefer: 'return=representation' }),
        body: JSON.stringify(ligne),
      });
      if (r.status === 409) return null;
      return (await lire<T[]>(r))[0] ?? null;
    },
    async enregistrer(table: string, ligne: Record<string, unknown>, conflit: string): Promise<void> {
      await f(`${url}/rest/v1/${table}?on_conflict=${conflit}`, {
        method: 'POST',
        headers: entetes({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(ligne),
      }).then(lire);
    },
    async modifier(table: string, requete: string, valeurs: Record<string, unknown>): Promise<void> {
      await f(`${url}/rest/v1/${table}?${requete}`, {
        method: 'PATCH',
        headers: entetes({ Prefer: 'return=minimal' }),
        body: JSON.stringify(valeurs),
      }).then(lire);
    },
    async supprimer(table: string, requete: string): Promise<void> {
      await f(`${url}/rest/v1/${table}?${requete}`, { method: 'DELETE', headers: entetes({ Prefer: 'return=minimal' }) }).then(lire);
    },
  };
}

export type Base = ReturnType<typeof base>;
