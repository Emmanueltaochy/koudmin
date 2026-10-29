import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { couleurs, rayons } from './theme';
import { Texte } from './Texte';

/** Case 24 px, radius 6, bordure galet ; cochée en basalte. */
export function CaseACocher({ cochee, onChange, libelle, erreur }: { cochee: boolean; onChange: (v: boolean) => void; libelle: string; erreur?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" aria-checked={cochee} onPress={() => onChange(!cochee)} style={styles.ligne} hitSlop={8}>
      <View style={[styles.case, cochee && styles.cochee, erreur && styles.erreur]}>
        {cochee && <Check size={16} color={couleurs.blanc} strokeWidth={2.5} />}
      </View>
      <Texte style={styles.texte}>{libelle}</Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 },
  case: { width: 24, height: 24, borderRadius: rayons.champ, borderWidth: 1, borderColor: couleurs.galet, backgroundColor: couleurs.blanc, alignItems: 'center', justifyContent: 'center' },
  cochee: { backgroundColor: couleurs.basalte, borderColor: couleurs.basalte },
  erreur: { borderWidth: 2, borderColor: couleurs.braise },
  texte: { flex: 1 },
});
