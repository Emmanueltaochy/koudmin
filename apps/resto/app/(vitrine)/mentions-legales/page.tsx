import type { Metadata } from 'next';
import { mentionsLegales } from '@kivien/core';
import { PageTexte } from '@/components/vitrine/PageTexte';

export const metadata: Metadata = { title: mentionsLegales.titre };

export default function MentionsLegales() {
  return <PageTexte page={mentionsLegales} />;
}
