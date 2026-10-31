import type { Metadata } from 'next';
import { confidentialite } from '@kivien/core';
import { PageTexte } from '@/components/vitrine/PageTexte';

export const metadata: Metadata = { title: confidentialite.titre };

export default function Confidentialite() {
  return <PageTexte page={confidentialite} />;
}
