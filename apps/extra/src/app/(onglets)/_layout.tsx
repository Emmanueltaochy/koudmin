import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import Calendar from 'lucide-react-native/icons/calendar';
import List from 'lucide-react-native/icons/list';
import User from 'lucide-react-native/icons/user';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { textes as t } from '@koudmin/core';
import { couleurs } from '../../ui/theme';
import { Texte } from '../../ui/Texte';

type IconeProps = { size: number; color: string; strokeWidth: number };

const o = t.extra.missions.onglets;
const ONGLETS: Record<string, { libelle: string; icone: ComponentType<IconeProps> }> = {
  index: { libelle: o.missions, icone: List },
  dispos: { libelle: o.dispos, icone: Calendar },
  profil: { libelle: o.profil, icone: User },
};

type BarreProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (nom: string) => void };
};

/** Barre d'onglets de la maquette : fond blanc, trait en haut, onglet actif en basalte 700. */
function Barre({ state, navigation }: BarreProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barre, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      {state.routes.map((route, i) => {
        const onglet = ONGLETS[route.name];
        if (!onglet) return null;
        const actif = state.index === i;
        const couleur = actif ? 'basalte' : 'galet';
        const Icone = onglet.icone;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            onPress={() => navigation.navigate(route.name)}
            style={styles.onglet}
          >
            <Icone size={24} color={couleurs[couleur]} strokeWidth={2} />
            <Texte variante={actif ? 'badge' : 'legende'} couleur={couleur}>
              {onglet.libelle}
            </Texte>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Onglets() {
  return (
    <Tabs
      tabBar={(p) => <Barre {...(p as unknown as BarreProps)} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: couleurs.creme } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="dispos" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    backgroundColor: couleurs.blanc,
    borderTopWidth: 1,
    borderTopColor: couleurs.trait,
    paddingTop: 8,
  },
  onglet: { flex: 1, alignItems: 'center', gap: 4, minHeight: 44 },
});
