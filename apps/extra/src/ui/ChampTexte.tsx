import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { couleurs, dimensions, rayons, textes } from './theme';
import { Texte } from './Texte';

type Props = TextInputProps & { libelle: string; aide?: string; erreur?: string };

/** Champ de la charte : 48 px, bordure galet, erreur en braise 2 px avec message dessous. */
export function ChampTexte({ libelle, aide, erreur, style, ...props }: Props) {
  return (
    <View style={styles.bloc}>
      <Texte variante="corpsFort" nativeID={`lib-${libelle}`}>
        {libelle}
      </Texte>
      <TextInput
        accessibilityLabel={libelle}
        accessibilityHint={erreur ?? aide}
        placeholderTextColor={couleurs.galet}
        style={[styles.champ, erreur ? styles.erreur : null, style]}
        {...props}
      />
      {erreur ? (
        <Texte variante="legendeForte" couleur="braise" accessibilityLiveRegion="polite">
          {erreur}
        </Texte>
      ) : aide ? (
        <Texte variante="legende" couleur="galet">
          {aide}
        </Texte>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 8 },
  champ: {
    ...textes.corpsFort,
    minHeight: dimensions.champHauteur,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: couleurs.galet,
    borderRadius: rayons.champ,
    backgroundColor: couleurs.blanc,
  },
  erreur: { borderWidth: 2, borderColor: couleurs.braise, paddingHorizontal: 15 },
});
