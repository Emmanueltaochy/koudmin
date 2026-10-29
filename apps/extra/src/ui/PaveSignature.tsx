import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { couleurs, rayons } from './theme';

export interface PaveSignatureRef {
  /** Signature en SVG (data URL), ou null si rien n'a été tracé. */
  image(): string | null;
  effacer(): void;
}

/** Signature au doigt : tracé basalte vectoriel, léger (pas d'image bitmap). */
export const PaveSignature = forwardRef<PaveSignatureRef, { erreur?: boolean; libelle: string }>(
  function PaveSignature({ erreur, libelle }, ref) {
    const [traits, setTraits] = useState<string[]>([]);
    const courant = useRef('');
    const [, rafraichir] = useState(0);
    const taille = useRef({ l: 300, h: 160 });

    const pan = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (e) => {
            const { locationX: x, locationY: y } = e.nativeEvent;
            courant.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          },
          onPanResponderMove: (e) => {
            const { locationX: x, locationY: y } = e.nativeEvent;
            courant.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
            rafraichir((n) => n + 1);
          },
          onPanResponderRelease: () => {
            if (courant.current.includes('L')) setTraits((t) => [...t, courant.current]);
            courant.current = '';
          },
        }),
      [],
    );

    useImperativeHandle(ref, () => ({
      image: () => {
        if (!traits.length) return null;
        const { l, h } = taille.current;
        const svg =
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(l)} ${Math.round(h)}">` +
          traits.map((d) => `<path d="${d}" fill="none" stroke="#211C18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
          '</svg>';
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      },
      effacer: () => setTraits([]),
    }));

    return (
      <View
        accessible
        accessibilityLabel={libelle}
        style={[styles.pave, erreur && styles.erreur]}
        onLayout={(e: LayoutChangeEvent) => {
          taille.current = { l: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
        {...pan.panHandlers}
      >
        <Svg width="100%" height="100%" pointerEvents="none">
          {[...traits, courant.current].filter(Boolean).map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={couleurs.basalte} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  pave: {
    height: 160,
    borderWidth: 1,
    borderColor: couleurs.galet,
    borderRadius: rayons.champ,
    backgroundColor: couleurs.blanc,
    overflow: 'hidden',
  },
  erreur: { borderWidth: 2, borderColor: couleurs.braise },
});
