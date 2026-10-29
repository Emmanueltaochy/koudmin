import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { animations } from './theme';

/** Pulse d'opacité 1 → 0,45 (squelettes), animé sur le thread natif. */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacite = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const demi = animations.squeletteMs / 2;
    const easing = Easing.inOut(Easing.ease);
    const useNativeDriver = Platform.OS !== 'web';
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacite, { toValue: animations.squeletteOpaciteMin, duration: demi, easing, useNativeDriver }),
        Animated.timing(opacite, { toValue: 1, duration: demi, easing, useNativeDriver }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [opacite]);
  return <Animated.View style={[style, { opacity: opacite }]}>{children}</Animated.View>;
}
