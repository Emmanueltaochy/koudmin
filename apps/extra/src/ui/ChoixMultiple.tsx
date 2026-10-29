import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { couleurs, rayons } from './theme';
import { Texte } from './Texte';

/** Choix multiple en chips (mêmes formes que Choix) : chaque chip se coche ou se décoche. */
export function ChoixMultiple<T extends string>({
  options,
  valeurs,
  onChange,
  libelle,
}: {
  options: { valeur: T; libelle: string }[];
  valeurs: readonly T[];
  onChange: (v: T[]) => void;
  libelle: string;
}) {
  return (
    <View style={styles.ligne} accessibilityLabel={libelle}>
      {options.map((o) => {
        const actif = valeurs.includes(o.valeur);
        return (
          <Pressable
            key={o.valeur}
            accessibilityRole="checkbox"
            aria-checked={actif}
            onPress={() => onChange(actif ? valeurs.filter((v) => v !== o.valeur) : [...valeurs, o.valeur])}
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
