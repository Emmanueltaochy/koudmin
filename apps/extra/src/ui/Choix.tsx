import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { couleurs, rayons } from './theme';
import { Texte } from './Texte';

/** Choix unique en chips (radius 6) : sélection basalte avec coche, comme les postes de la maquette. */
export function Choix<T extends string | boolean>({
  options,
  valeur,
  onChange,
  libelle,
}: {
  options: { valeur: T; libelle: string }[];
  valeur: T | null;
  onChange: (v: T) => void;
  libelle: string;
}) {
  return (
    <View style={styles.ligne} accessibilityRole="radiogroup" accessibilityLabel={libelle}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={String(o.valeur)}
            accessibilityRole="radio"
            aria-checked={actif}
            onPress={() => onChange(o.valeur)}
            style={[styles.chip, actif ? styles.actif : styles.inactif]}
          >
            {actif && <Check size={16} color={couleurs.blanc} strokeWidth={2.5} />}
            <Texte variante={actif ? 'corpsFort' : 'corps'} couleur={actif ? 'blanc' : 'basalte'}>
              {o.libelle}
            </Texte>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: rayons.champ,
    borderWidth: 1,
  },
  actif: { backgroundColor: couleurs.basalte, borderColor: couleurs.basalte },
  inactif: { backgroundColor: couleurs.blanc, borderColor: couleurs.galet },
});
