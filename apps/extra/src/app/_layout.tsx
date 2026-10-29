import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts, type FontSource } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { couleurs } from '../ui/theme';

void SplashScreen.preventAutoHideAsync();

// En build natif, les polices sont intégrées par le plugin expo-font (app.json) : rien à charger.
// Sur le web et dans Expo Go, on les charge à l'exécution.
const chargerPolices =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const POLICES: Record<string, FontSource> = chargerPolices
  ? {
      Figtree_400Regular: require('../../assets/fonts/Figtree_400Regular.ttf'),
      Figtree_500Medium: require('../../assets/fonts/Figtree_500Medium.ttf'),
      Figtree_600SemiBold: require('../../assets/fonts/Figtree_600SemiBold.ttf'),
      Figtree_700Bold: require('../../assets/fonts/Figtree_700Bold.ttf'),
      'BricolageGrotesque-600-22': require('../../assets/fonts/BricolageGrotesque-600-22.ttf'),
      'BricolageGrotesque-700-22': require('../../assets/fonts/BricolageGrotesque-700-22.ttf'),
      'BricolageGrotesque-700-32': require('../../assets/fonts/BricolageGrotesque-700-32.ttf'),
    }
  : {};

export default function Racine() {
  const [policesPretes, erreur] = useFonts(POLICES);
  const pret = policesPretes || erreur !== null;

  useEffect(() => {
    if (pret) void SplashScreen.hideAsync();
  }, [pret]);

  if (!pret) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.creme } }}
      >
        <Stack.Screen name="(onglets)" />
        <Stack.Screen name="mission/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}
