import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormulaireDemande } from './FormulaireDemande';

export const metadata: Metadata = { title: 'Trouver un extra' };

export default function PageDemande() {
  return (
    <Suspense>
      <FormulaireDemande />
    </Suspense>
  );
}
