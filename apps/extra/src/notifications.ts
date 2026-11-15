import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { source } from './donnees';

/**
 * Notifications sur le téléphone (app installée depuis l'App Store ou Google Play) : nouvelles
 * missions, contrat à signer, rappel de la veille. Envoyées par le VPS via le service d'Expo ;
 * l'app enregistre le jeton de l'appareil et ouvre la bonne page quand on touche la notification.
 * Sur le web (app.kivien.re), rien : les alertes partent par e-mail.
 */
const natif = Platform.OS === 'ios' || Platform.OS === 'android';

if (natif) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Demande l'autorisation (une fois) et enregistre le jeton de l'appareil pour le compte connecté. */
export async function activerNotifications(): Promise<void> {
  if (!natif || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('missions', {
      name: 'Missions',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status === 'undetermined') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await source.enregistrerJetonPush(data, Platform.OS as 'ios' | 'android');
}

/** Toucher une notification ouvre la mission ou le contrat concerné, même app fermée. */
export function suivreNotifications(): () => void {
  if (!natif) return () => undefined;
  const ouvrir = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  };
  void Notifications.getLastNotificationResponseAsync().then(ouvrir);
  const abonnement = Notifications.addNotificationResponseReceivedListener(ouvrir);
  return () => abonnement.remove();
}
