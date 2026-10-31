import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatHeure, minuteReunion, pointageOuvert, textesPointage as tp } from '@kivien/core';
import { source } from '../donnees';
import type { Pointage as Etat } from '../donnees/source';
import { BoutonSecondaire } from '../ui/Bouton';
import { couleurs, rayons } from '../ui/theme';
import { Texte } from '../ui/Texte';

const heure = (iso: string) => formatHeure(minuteReunion(new Date(iso)));

/** Pointage sur place d'une mission confirmée : arrivée puis départ, vus par l'établissement. */
export function Pointage({
  demandeId,
  jour,
  debut,
  fin,
}: {
  demandeId: string;
  jour: string;
  debut: number;
  fin: number;
}) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const ouvert = pointageOuvert(jour, debut, fin);

  useEffect(() => {
    void source
      .monPointage(demandeId)
      .then(setEtat)
      .catch(() => undefined);
  }, [demandeId]);

  if (!ouvert && !etat?.arriveeLe) return null;

  async function pointer(moment: 'arrivee' | 'depart') {
    if (envoi) return;
    setEnvoi(true);
    setErreur(false);
    try {
      setEtat(await source.pointer(demandeId, moment));
    } catch {
      setErreur(true);
    }
    setEnvoi(false);
  }

  return (
    <View style={styles.carte} accessibilityLabel={tp.titre}>
      <Texte variante="corpsFort">{tp.titre}</Texte>
      {etat?.arriveeLe ? (
        <Texte variante="legendeForte" couleur="vacoa">
          {tp.arriveeLe(heure(etat.arriveeLe))}
        </Texte>
      ) : null}
      {etat?.departLe ? (
        <Texte variante="legendeForte" couleur="vacoa">
          {tp.departLe(heure(etat.departLe))}
        </Texte>
      ) : null}
      {ouvert && !etat?.arriveeLe ? (
        <BoutonSecondaire libelle={tp.arrivee} onPress={() => void pointer('arrivee')} />
      ) : null}
      {ouvert && etat?.arriveeLe && !etat.departLe ? (
        <BoutonSecondaire libelle={tp.depart} onPress={() => void pointer('depart')} />
      ) : null}
      <Texte variante={erreur ? 'legendeForte' : 'legende'} couleur={erreur ? 'braise' : 'galet'}>
        {erreur ? tp.erreur : tp.aide}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { gap: 8, padding: 16, borderRadius: rayons.carte, backgroundColor: couleurs.blanc },
});
