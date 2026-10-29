import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { MissionResume, Poste } from '@koudmin/core';
import { ErreurReseau, type Profil, type SourceDonnees } from './source';

interface LigneMission {
  id: string;
  restaurant: string;
  commune: string;
  distance_metres: number;
  poste: Poste;
  jour: string;
  debut: number;
  fin: number;
  taux_horaire_brut_centimes: number;
  retour_assure: boolean;
  bus_retour: number | null;
}

const versMission = (l: LigneMission): MissionResume => ({
  id: l.id,
  restaurant: l.restaurant,
  commune: l.commune,
  distanceMetres: l.distance_metres,
  poste: l.poste,
  jour: l.jour,
  debut: l.debut,
  fin: l.fin,
  tauxHoraireBrutCentimes: l.taux_horaire_brut_centimes,
  retourAssure: l.retour_assure,
  busRetour: l.bus_retour,
});

function verifier<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) {
    // supabase-js remonte les coupures réseau comme « TypeError: Network request failed ».
    if (/network|fetch/i.test(r.error.message)) throw new ErreurReseau(r.error.message);
    throw new Error(r.error.message);
  }
  return r.data as T;
}

export function sourceSupabase(url: string, cle: string): SourceDonnees {
  const client: SupabaseClient = createClient(url, cle);
  return {
    async profil(): Promise<Profil> {
      const p = verifier(
        await client.from('extras').select('prenom, commune, a_voiture').single<{
          prenom: string;
          commune: string;
          a_voiture: boolean;
        }>(),
      );
      return { prenom: p.prenom, commune: p.commune, aVoiture: p.a_voiture };
    },
    async missions() {
      return verifier(await client.rpc('missions_disponibles')).map(versMission);
    },
    ecouterMissions(rappel) {
      const canal = client
        .channel('signaux_missions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signaux_missions' }, rappel)
        .subscribe();
      return () => {
        void client.removeChannel(canal);
      };
    },
  };
}
