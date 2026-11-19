import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { textesEcrans } from '@kivien/core';
import { ouvrirEspacePro } from '../pro/modePro';
import { BoutonPrincipal, Lien } from '../ui/Bouton';
import { couleurs, rayons } from '../ui/theme';
import { Logo } from '../ui/Logo';
import { Texte } from '../ui/Texte';

const ta = textesEcrans.accueilApp;
const ECART = 8;
const DUREE_MS = 40_000;

type Photo = { source: ImageSourcePropType; hauteur: number; alt: string };
const CUISINE = require('../../assets/visuels/cuisine.jpg');
const SALLE = require('../../assets/visuels/salle.jpg');
const EXTRA = require('../../assets/visuels/bandeau.jpg');
const MONTE: Photo[] = [
  { source: CUISINE, hauteur: 240, alt: ta.photos.cuisine },
  { source: EXTRA, hauteur: 200, alt: ta.photos.extra },
  { source: SALLE, hauteur: 220, alt: ta.photos.salle },
];
const DESCEND: Photo[] = [
  { source: SALLE, hauteur: 210, alt: ta.photos.salle },
  { source: CUISINE, hauteur: 230, alt: ta.photos.cuisine },
  { source: EXTRA, hauteur: 220, alt: ta.photos.extra },
];

/** Une colonne de photos qui défile sans fin (la série est doublée pour boucler sans saut). */
function Colonne({
  photos,
  sens,
  animer,
}: {
  photos: Photo[];
  sens: 'monte' | 'descend';
  animer: boolean;
}) {
  const serie = photos.reduce((s, p) => s + p.hauteur + ECART, 0);
  const position = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animer) return;
    const boucle = Animated.loop(
      Animated.timing(position, {
        toValue: 1,
        duration: DUREE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    boucle.start();
    return () => boucle.stop();
  }, [animer, position]);
  const translateY = position.interpolate({
    inputRange: [0, 1],
    outputRange: sens === 'monte' ? [0, -serie] : [-serie, 0],
  });
  return (
    <View style={styles.masque}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {[...photos, ...photos].map((p, i) => (
          <Image
            key={i}
            source={p.source}
            accessibilityLabel={i < photos.length ? p.alt : undefined}
            accessibilityElementsHidden={i >= photos.length}
            style={[styles.photo, { height: p.hauteur }]}
            resizeMode="cover"
          />
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Premier écran sans compte : photos des métiers qui défilent, puis le choix.
 * Extra : inscription dans l'app. Établissement : l'espace pro de kivien.re, ouvert dans l'app.
 */
export default function Accueil() {
  const insets = useSafeAreaInsets();
  const [animer, setAnimer] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduit) => setAnimer(!reduit))
      .catch(() => undefined);
  }, []);

  return (
    <View style={styles.ecran}>
      <View
        style={[styles.photos, { paddingTop: insets.top + 8 }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Colonne photos={MONTE} sens="monte" animer={animer} />
        <Colonne photos={DESCEND} sens="descend" animer={animer} />
        <View style={styles.fondu} pointerEvents="none">
          {[0.2, 0.45, 0.7, 0.92].map((o) => (
            <View key={o} style={[styles.bandeFondu, { opacity: o }]} />
          ))}
        </View>
      </View>
      <View style={[styles.bas, { paddingBottom: insets.bottom + 24 }]}>
        <Logo />
        <View style={styles.textes}>
          <Texte variante="titre" accessibilityRole="header">
            {ta.titre}
          </Texte>
          <Texte couleur="galet">{ta.texte}</Texte>
        </View>
        <BoutonPrincipal libelle={ta.extra} onPress={() => router.push('/bienvenue')} />
        <Pressable
          accessibilityRole="link"
          onPress={() => void ouvrirEspacePro('/pro')}
          style={({ pressed }) => [styles.pro, pressed && styles.proPresse]}
        >
          <Texte variante="bouton">{ta.pro}</Texte>
        </Pressable>
        <Lien
          libelle={ta.connexion}
          onPress={() => router.push('/connexion')}
          variante="legende"
          couleur="galet"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  photos: { flex: 1, flexDirection: 'row', gap: ECART, paddingHorizontal: 16, overflow: 'hidden' },
  masque: { flex: 1, overflow: 'hidden', borderRadius: rayons.carte },
  photo: { width: '100%', borderRadius: rayons.carte, marginBottom: ECART },
  fondu: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
  bandeFondu: { flex: 1, backgroundColor: couleurs.creme },
  bas: { paddingHorizontal: 16, paddingTop: 16, gap: 16, backgroundColor: couleurs.creme },
  textes: { gap: 6 },
  pro: {
    height: 52,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.basalte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPresse: { backgroundColor: couleurs.blanc },
});
