import { Pressable, StyleSheet } from 'react-native';
import { couleurs, dimensions, rayons } from './theme';
import { Texte } from './Texte';

/** Bouton principal piment. Un seul par écran. Appuyé : piment foncé (équivalent du survol). */
export function BoutonPrincipal({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.principal,
        { backgroundColor: pressed ? couleurs.pimentFonce : couleurs.piment },
      ]}
    >
      <Texte variante="bouton" couleur="blanc">
        {libelle}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  principal: {
    height: dimensions.boutonPrincipal,
    borderRadius: rayons.carte,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
