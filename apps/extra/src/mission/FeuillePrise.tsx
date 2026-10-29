import { StyleSheet, View } from 'react-native';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { textePrise, textes as t } from '@koudmin/core';
import { BoutonPrincipal } from '../ui/Bouton';
import { couleurs, rayons, voile } from '../ui/theme';
import { Texte } from '../ui/Texte';

/** Bottom sheet « Mission déjà prise », sur un voile basalte à 50 %. */
export function FeuillePrise({
  missionsRestantes,
  quand,
  onVoirMissions,
}: {
  missionsRestantes: number;
  quand: string;
  onVoirMissions: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.voile} accessibilityViewIsModal>
      <View style={[styles.feuille, { paddingBottom: 32 + insets.bottom }]}>
        <CircleAlert size={28} color={couleurs.braise} strokeWidth={2} />
        <Texte variante="sousTitre" accessibilityRole="header" accessibilityLiveRegion="assertive">
          {t.extra.detail.priseTitre}
        </Texte>
        <Texte couleur="galet">{textePrise(missionsRestantes, quand)}</Texte>
        <BoutonPrincipal libelle={t.extra.detail.voirMissions} onPress={onVoirMissions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  voile: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: voile, justifyContent: 'flex-end' },
  feuille: {
    backgroundColor: couleurs.blanc,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
    paddingTop: 32,
    paddingHorizontal: 16,
    gap: 16,
  },
});
