import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import { animations } from './theme';

/** Spinner de la maquette : arc lucide, rotation linéaire 0,9 s. */
export function Spinner({ couleur, taille = 20 }: { couleur: string; taille?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: animations.spinnerMs,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    boucle.start();
    return () => boucle.stop();
  }, [rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }} accessibilityElementsHidden importantForAccessibility="no">
      <LoaderCircle size={taille} color={couleur} strokeWidth={2.5} />
    </Animated.View>
  );
}
