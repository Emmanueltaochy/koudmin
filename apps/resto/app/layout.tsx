import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '@kivien/ui-tokens/tokens.css';
import './globals.css';
import { SuiviPages } from '@/components/SuiviPages';

const bricolage = localFont({
  src: './polices/BricolageGrotesque-variable-latin.woff2',
  weight: '200 800',
  variable: '--police-bricolage',
  display: 'swap',
});

const figtree = localFont({
  src: [
    { path: './polices/Figtree_400Regular.ttf', weight: '400' },
    { path: './polices/Figtree_500Medium.ttf', weight: '500' },
    { path: './polices/Figtree_600SemiBold.ttf', weight: '600' },
    { path: './polices/Figtree_700Bold.ttf', weight: '700' },
  ],
  variable: '--police-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Kivien · Les extras péi, près de chez vous.', template: '%s · Kivien' },
  description: "Trouvez un extra pour aujourd'hui à La Réunion, environ 20 % moins cher que l'intérim : restaurants, hôtels, bars. Contrat d'extra rédigé pour vous.",
};

export const viewport: Viewport = {
  themeColor: '#FBF6EE',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        {children}
        <SuiviPages />
      </body>
    </html>
  );
}
