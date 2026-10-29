import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ajouterJours, aujourdhuiReunion, jourCourt, textesEcrans } from '@kivien/core';
import { source, type CleDispo, type Creneau } from '../../donnees';
import { couleurs, rayons } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

const td = textesEcrans.extra.dispos;
/** Deux semaines à cocher : assez pour s'organiser, assez court pour rester à jour. */
const NB_JOURS = 14;
const CRENEAUX: Creneau[] = ['midi', 'soir'];

function libelleJour(jour: string, aujourdhui: string) {
  if (jour === aujourdhui) return "Aujourd'hui";
  if (jour === ajouterJours(aujourdhui, 1)) return 'Demain';
  return jourCourt(jour);
}

/** Disponibilités : pilules Midi / Soir sur 14 jours, enregistrées à chaque appui. */
export default function Dispos() {
  const insets = useSafeAreaInsets();
  const aujourdhui = aujourdhuiReunion();
  const jours = Array.from({ length: NB_JOURS }, (_, i) => ajouterJours(aujourdhui, i));
  const [actives, setActivesEtat] = useState<Set<CleDispo>>(new Set());
  const courantes = useRef(actives);
  const setActives = (s: Set<CleDispo>) => {
    courantes.current = s;
    setActivesEtat(s);
  };
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void source.dispos().then((d) => setActives(new Set(d))).catch(() => undefined);
  }, []);

  const basculer = useCallback(async (jour: string, creneau: Creneau) => {
    const cle = `${jour}:${creneau}` as CleDispo;
    const actif = !courantes.current.has(cle);
    const appliquer = (oui: boolean) => {
      const s = new Set(courantes.current);
      if (oui) s.add(cle);
      else s.delete(cle);
      setActives(s);
    };
    appliquer(actif); // affichage immédiat
    try {
      await source.basculerDispo(jour, creneau, actif);
      setMessage(td.enregistre);
    } catch {
      appliquer(!actif); // échec : retour à l'état précédent, et on le dit
      setMessage(textesEcrans.connexion.pasDeReseauExtra);
    }
  }, []);

  return (
    <View style={[styles.ecran, { paddingTop: insets.top + 8 }]}>
      <View style={styles.entete}>
        <Texte variante="titre" accessibilityRole="header">
          {td.titre}
        </Texte>
        <Texte couleur="galet">{td.sousTitre}</Texte>
        <Texte variante="legendeForte" couleur={message === td.enregistre ? 'vacoa' : 'braise'} accessibilityLiveRegion="polite" style={styles.message}>
          {message ?? ' '}
        </Texte>
      </View>
      <FlatList
        data={jours}
        keyExtractor={(j) => j}
        contentContainerStyle={styles.liste}
        renderItem={({ item: jour }) => (
          <View style={styles.ligne}>
            <Texte variante="corpsFort" style={styles.jour}>
              {libelleJour(jour, aujourdhui)}
            </Texte>
            <View style={styles.creneaux}>
              {CRENEAUX.map((c) => {
                const actif = actives.has(`${jour}:${c}` as CleDispo);
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="checkbox"
                    aria-checked={actif}
                    accessibilityLabel={`${libelleJour(jour, aujourdhui)}, ${td[c]}`}
                    onPress={() => void basculer(jour, c)}
                    hitSlop={4}
                    style={[styles.pilule, actif ? styles.actif : styles.inactif]}
                  >
                    <Texte variante={actif ? 'corpsFort' : 'corps'} couleur={actif ? 'blanc' : 'basalte'}>
                      {td[c]}
                    </Texte>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  entete: { paddingHorizontal: 16, gap: 4, paddingBottom: 8 },
  message: { minHeight: 18 },
  liste: { paddingHorizontal: 16, paddingBottom: 16 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.trait,
  },
  jour: { flexShrink: 1 },
  creneaux: { flexDirection: 'row', gap: 8 },
  pilule: { minWidth: 76, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: rayons.pilule, borderWidth: 1 },
  actif: { backgroundColor: couleurs.basalte, borderColor: couleurs.basalte },
  inactif: { backgroundColor: couleurs.blanc, borderColor: couleurs.galet },
});
