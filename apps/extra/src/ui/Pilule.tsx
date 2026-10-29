import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { couleurs, rayons } from './theme';
import { Texte } from './Texte';

/** Pilule de filtre (créneau) : sélectionnée en basalte, sinon blanche bordée de galet. */
export function PiluleFiltre({
  libelle,
  active,
  onPress,
}: {
  libelle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={active}
      onPress={onPress}
      // Pilule de 42 px : on étend la zone tactile à 44 px minimum.
      hitSlop={4}
      style={[styles.pilule, active ? styles.active : styles.inactive]}
    >
      <Texte variante={active ? 'corpsFort' : 'corps'} couleur={active ? 'blanc' : 'basalte'}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Pilule d'information (localisation) : 13 px 600, contour galet. */
export function PiluleInfo({ icone, libelle }: { icone: ReactNode; libelle: string }) {
  return (
    <View style={[styles.info]}>
      {icone}
      <Texte variante="legendeForte">{libelle}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  pilule: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: rayons.pilule,
    borderWidth: 1,
  },
  active: { backgroundColor: couleurs.basalte, borderColor: couleurs.basalte },
  inactive: { backgroundColor: couleurs.blanc, borderColor: couleurs.galet },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: couleurs.blanc,
    borderWidth: 1,
    borderColor: couleurs.galet,
    borderRadius: rayons.pilule,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
