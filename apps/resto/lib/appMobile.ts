'use client';

/** Le site est affiché dans l'app mobile Kivien (espace pro intégré). */
export function dansAppMobile(): boolean {
  return typeof navigator !== 'undefined' && /KivienApp/.test(navigator.userAgent);
}

/** Demande à l'app mobile de revenir à son écran d'accueil (choix extra ou établissement). */
export function revenirAccueilApp(): void {
  const pont = (window as unknown as { ReactNativeWebView?: { postMessage(m: string): void } })
    .ReactNativeWebView;
  pont?.postMessage('accueil');
}
