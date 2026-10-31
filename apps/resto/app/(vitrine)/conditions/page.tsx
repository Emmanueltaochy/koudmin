import type { Metadata } from 'next';
import { conditionsGenerales } from '@kivien/core';
import { PageTexte } from '@/components/vitrine/PageTexte';

export const metadata: Metadata = { title: conditionsGenerales.titre };

export default function Conditions() {
  return <PageTexte page={conditionsGenerales} />;
}
