import type { MetadataRoute } from 'next';
import { textesEcrans } from '@kivien/core';
import { couleurs } from '@kivien/ui-tokens';

const ti = textesEcrans.resto.installation;

/** Manifeste : l'espace pro s'installe comme une application (Windows, Mac, téléphone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/espace',
    name: ti.nomApp,
    short_name: ti.nomCourt,
    description: ti.description,
    lang: 'fr',
    start_url: '/espace',
    scope: '/',
    display: 'standalone',
    background_color: couleurs.creme,
    theme_color: couleurs.creme,
    icons: [
      { src: '/brand/app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
