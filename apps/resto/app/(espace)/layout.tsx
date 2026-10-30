import { Suspense } from 'react';
import { EnTete } from '@/components/EnTete';
import { Garde } from '@/components/Garde';
import s from './espace.module.css';

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Garde>
      <Suspense>
        <EnTete />
      </Suspense>
      <main className={s.contenu}>{children}</main>
    </Garde>
  );
}
