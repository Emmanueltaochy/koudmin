import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texte } from '../../ui/Texte';

// Détail mission + « Mi lé la » : étape c.
export default function DetailMission() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
      <Texte onPress={() => router.back()}>{id}</Texte>
    </View>
  );
}
