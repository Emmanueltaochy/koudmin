import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { couleurs, rayons } from './theme';

export interface PaveSignatureRef {
  /** Signature en SVG (data URL), ou null si rien n'a été tracé. */
  image(): string | null;
  effacer(): void;
}

/** Signature au doigt : tracé basalte vectoriel, léger (pas d'image bitmap). */
/**
 * `onTrace(true)` au début du tracé, `onTrace(false)` à la fin : l'écran bloque son défilement
 * pendant la signature (sinon, sur téléphone, le doigt fait défiler la page au lieu de signer).
 */
export const PaveSignature = forwardRef<PaveSignatureRef, { erreur?: boolean; libelle: string; onTrace?: (enCours: boolean) => void }>(
  function PaveSignature({ erreur, libelle, onTrace }, ref) {
    const [traits, setTraits] = useState<string[]>([]);
    const courant = useRef('');
    const [, rafraichir] = useState(0);
    const taille = useRef({ l: 300, h: 160 });
    const zone = useRef<unknown>(null);
    const traceRef = useRef(onTrace);
    traceRef.current = onTrace;

    // Navigateur (app.kivien.re sur téléphone) : le glisser du doigt ne fait pas défiler la page.
    useEffect(() => {
      if (Platform.OS !== 'web') return;
      const el = zone.current as unknown as HTMLElement | null;
      if (!el?.addEventListener) return;
      el.style.touchAction = 'none';
      const bloquer = (e: TouchEvent) => e.preventDefault();
      el.addEventListener('touchstart', bloquer, { passive: false });
      el.addEventListener('touchmove', bloquer, { passive: false });
      return () => {
        el.removeEventListener('touchstart', bloquer);
        el.removeEventListener('touchmove', bloquer);
      };
    }, []);

    // Le trait est copié avant de vider `courant` : la fonction passée à setTraits s'exécute plus tard.
    const finirTrait = () => {
      const trait = courant.current;
      courant.current = '';
      if (trait.includes('L')) setTraits((t) => [...t, trait]);
      traceRef.current?.(false);
    };

    const pan = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          // Le défilement de l'écran ne reprend pas la main pendant le tracé.
          onPanResponderTerminationRequest: () => false,
          onShouldBlockNativeResponder: () => true,
          onPanResponderGrant: (e) => {
            traceRef.current?.(true);
            const { locationX: x, locationY: y } = e.nativeEvent;
            courant.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          },
          onPanResponderMove: (e) => {
            const { locationX: x, locationY: y } = e.nativeEvent;
            courant.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
            rafraichir((n) => n + 1);
          },
          onPanResponderRelease: () => finirTrait(),
          onPanResponderTerminate: () => finirTrait(),
        }),
      [],
    );

    useImperativeHandle(ref, () => ({
      image: () => {
        const valides = traits.filter((d) => d.includes('L'));
        if (!valides.length) return null;
        const { l, h } = taille.current;
        const svg =
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(l)} ${Math.round(h)}">` +
          valides.map((d) => `<path d="${d}" fill="none" stroke="#211C18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
          '</svg>';
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      },
      effacer: () => setTraits([]),
    }));

    return (
      <View
        ref={zone as never}
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
