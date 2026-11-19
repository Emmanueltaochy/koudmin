import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { textesEcrans } from '@kivien/core';
import { noterModePro, prendreDepart, SITE_PRO } from '../pro/modePro';
import { Lien } from '../ui/Bouton';
import { EtatPlein } from '../ui/EtatPlein';
import { couleurs } from '../ui/theme';

const tp = textesEcrans.proApp;
/** Pages gardées dans l'app : kivien.re, et les pages de paiement qui y reviennent ensuite. */
const DANS_APP = /^https:\/\/([a-z0-9-]+\.)*(kivien\.re|stripe\.com|gocardless\.com)(\/|$|\?|#)/i;

/**
 * Espace pro (kivien.re) affiché dans l'app, sans barre de l'app : un seul en-tête, celui du site,
 * dont le menu propose le retour à l'accueil de l'app. Les établissements y retrouvent tout leur espace.
 * Téléphone, SMS, e-mail et sites extérieurs s'ouvrent dans leurs propres apps.
 */
export default function EspacePro() {
  const insets = useSafeAreaInsets();
  const vue = useRef<WebView<object>>(null);
  const [depart] = useState(prendreDepart);
  const [retourPossible, setRetourPossible] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);

  // Sur le web, pas de vue intégrée : l'espace pro s'ouvre directement sur kivien.re.
  useEffect(() => {
    if (Platform.OS === 'web') globalThis.location?.assign(`${SITE_PRO}/espace`);
  }, []);

  // Android : le bouton retour revient d'abord à la page précédente de l'espace pro.
  useEffect(() => {
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!retourPossible) return false;
      vue.current?.goBack();
      return true;
    });
    return () => abonnement.remove();
  }, [retourPossible]);

  const filtrer = useCallback((requete: { url: string }) => {
    if (DANS_APP.test(requete.url) || requete.url === 'about:blank') return true;
    // tel:, sms:, mailto:, WhatsApp, net-entreprises.fr… : hors de l'app.
    void Linking.openURL(requete.url).catch(() => undefined);
    return false;
  }, []);

  async function quitter() {
    await noterModePro(false);
    router.replace('/accueil' as never);
  }

  if (Platform.OS === 'web') return null;

  return (
    <View style={[styles.ecran, { paddingTop: insets.top }]}>
      {horsLigne ? (
        <EtatPlein
          icone={<WifiOff size={28} color={couleurs.braise} strokeWidth={1.75} />}
          titre={tp.horsLigneTitre}
          couleurTitre="braise"
          texte={tp.horsLigneTexte}
          action={tp.reessayer}
          onAction={() => setHorsLigne(false)}
        />
      ) : null}
      {horsLigne ? (
        <View style={styles.sortie}>
          <Lien
            libelle={tp.retourAccueil}
            onPress={() => void quitter()}
            variante="legende"
            couleur="galet"
          />
        </View>
      ) : (
        <WebView<object>
          ref={vue}
          source={{ uri: depart }}
          style={styles.vue}
          // Reconnu par le site : pas de proposition d'installation dans l'app.
          applicationNameForUserAgent="KivienApp"
          onShouldStartLoadWithRequest={filtrer}
          onNavigationStateChange={(n: WebViewNavigation) => setRetourPossible(n.canGoBack)}
          onError={() => setHorsLigne(true)}
          // Le site demande le retour à l'accueil de l'app (bouton de son menu).
          onMessage={(e) => {
            if (e.nativeEvent.data === 'accueil') void quitter();
          }}
          // Liens « nouvel onglet » ouverts dans la même vue (puis filtrés ci-dessus).
          setSupportMultipleWindows={false}
          domStorageEnabled
          sharedCookiesEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.chargement} accessibilityLabel={tp.chargement}>
              <ActivityIndicator color={couleurs.basalte} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.creme },
  sortie: { alignItems: 'center', paddingBottom: 32 },
  vue: { flex: 1, backgroundColor: couleurs.creme },
  chargement: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.creme,
  },
});
