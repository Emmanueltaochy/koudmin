import { Suspense } from 'react';
import { EnTete } from '@/components/EnTete';
import { Garde } from '@/components/Garde';

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Garde>
      <Suspense>
        <EnTete />
      </Suspense>
      <main>{children}</main>
    </Garde>
  );
}
