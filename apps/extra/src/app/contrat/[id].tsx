import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { textes as t } from '@koudmin/core';
import { couleurs } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

// Contrat + signature : écran « pas encore dessiné », conçu à l'étape e.
export default function Contrat() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 4, paddingHorizontal: 8, gap: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={() => router.back()}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <ChevronLeft size={24} color={couleurs.basalte} strokeWidth={2} />
      </Pressable>
      <Texte variante="titre" style={{ paddingHorizontal: 8 }}>
        {t.extra.detail.signer}
      </Texte>
    </View>
  );
}
