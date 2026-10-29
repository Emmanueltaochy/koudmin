import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import X from 'lucide-react-native/icons/x';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMMUNES_REUNION } from '@koudmin/core';
import { couleurs, dimensions, rayons } from './theme';
import { Texte } from './Texte';

/** Choix de la commune parmi les 24 de La Réunion, dans une liste plein écran. */
export function ChoixCommune({
  libelle,
  valeur,
  erreur,
  onChange,
}: {
  libelle: string;
  valeur: string;
  erreur?: string;
  onChange: (c: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.bloc}>
      <Texte variante="corpsFort">{libelle}</Texte>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${valeur || 'à choisir'}`}
        onPress={() => setOuvert(true)}
        style={[styles.champ, erreur ? styles.erreur : null]}
      >
        <Texte variante={valeur ? 'corpsFort' : 'corps'} couleur={valeur ? 'basalte' : 'galet'}>
          {valeur || 'Saint-Paul, Le Port…'}
        </Texte>
        <ChevronDown size={20} color={couleurs.galet} strokeWidth={2} />
      </Pressable>
      {erreur ? (
        <Texte variante="legendeForte" couleur="braise">
          {erreur}
        </Texte>
      ) : null}
      <Modal visible={ouvert} animationType="slide" onRequestClose={() => setOuvert(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 8 }]}>
          <View style={styles.enteteModal}>
            <Texte variante="sousTitre">{libelle}</Texte>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setOuvert(false)} style={styles.fermer}>
              <X size={24} color={couleurs.basalte} strokeWidth={2} />
            </Pressable>
          </View>
          <FlatList
            data={COMMUNES_REUNION}
            keyExtractor={(c) => c.nom}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                aria-checked={item.nom === valeur}
                onPress={() => {
                  onChange(item.nom);
                  setOuvert(false);
                }}
                style={styles.option}
              >
                <Texte variante={item.nom === valeur ? 'corpsFort' : 'corps'}>{item.nom}</Texte>
                {item.nom === valeur && <Check size={20} color={couleurs.basalte} strokeWidth={2.5} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 8 },
  champ: {
    minHeight: dimensions.champHauteur,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: couleurs.galet,
    borderRadius: rayons.champ,
    backgroundColor: couleurs.blanc,
  },
  erreur: { borderWidth: 2, borderColor: couleurs.braise, paddingHorizontal: 15 },
  modal: { flex: 1, backgroundColor: couleurs.creme },
  enteteModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  fermer: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.trait,
  },
});
