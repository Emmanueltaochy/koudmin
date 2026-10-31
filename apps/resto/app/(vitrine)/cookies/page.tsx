import type { Metadata } from 'next';
import { cookies } from '@kivien/core';
import { PageTexte } from '@/components/vitrine/PageTexte';

export const metadata: Metadata = { title: cookies.titre };

export default function Cookies() {
  return <PageTexte page={cookies} />;
}
