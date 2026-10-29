import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { textes as t } from '@koudmin/core';
import { Texte } from '../../ui/Texte';

// Écran « Disponibilités » : à concevoir à l'étape e.
export default function Dispos() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
      <Texte variante="titre">{t.extra.missions.onglets.dispos}</Texte>
    </View>
  );
}
