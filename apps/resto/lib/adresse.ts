/**
 * Adresses de La Réunion via le service de géocodage de l'IGN (Géoplateforme, base adresse nationale).
 * Les coordonnées servent à calculer la distance affichée aux extras.
 */
export interface AdresseGeo {
  /** Libellé complet affiché dans le champ. */
  libelle: string;
  /** Numéro et voie. */
  voie: string;
  codePostal: string;
  commune: string;
  lat: number;
  lng: number;
}

const API = 'https://data.geopf.fr/geocodage/search';

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: { label: string; name: string; postcode?: string; city: string; type: string; score: number };
}

/** Numéro saisi en tête (« 14 », « 14 bis »), gardé si la suggestion est une rue sans numéro. */
function numeroSaisi(q: string): string | null {
  const m = /^\s*(\d+\s*(?:bis|ter)?)\b/i.exec(q);
  return m ? m[1]!.replace(/\s+/g, ' ') : null;
}

function versAdresse(f: Feature, q: string): AdresseGeo {
  const p = f.properties;
  const numero = p.type === 'street' ? numeroSaisi(q) : null;
  const voie = numero ? `${numero} ${p.name}` : p.name;
  const codePostal = p.postcode ?? '';
  return {
    libelle: `${voie}, ${codePostal} ${p.city}`,
    voie,
    codePostal,
    commune: p.city,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  };
}

/** Suggestions limitées à La Réunion (codes postaux 974xx). */
export async function suggererAdresses(q: string, signal?: AbortSignal): Promise<AdresseGeo[]> {
  if (q.trim().length < 3) return [];
  const url = `${API}?q=${encodeURIComponent(q)}&limit=8&index=address&lat=-21.115&lon=55.536`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Géocodage indisponible (${r.status})`);
  const j = (await r.json()) as { features: Feature[] };
  return j.features
    .filter((f) => (f.properties.postcode ?? '').startsWith('974'))
    .slice(0, 5)
    .map((f) => versAdresse(f, q));
}

/** Géocode une adresse tapée sans choisir de suggestion. null si rien de fiable à La Réunion. */
export async function geocoder(q: string): Promise<AdresseGeo | null> {
  const [premiere] = await suggererAdresses(q);
  return premiere ?? null;
}
