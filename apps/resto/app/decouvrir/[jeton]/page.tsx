'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import p from '@/components/pages.module.css';
import { source } from '@/lib/donnees';
import { memoriserJeton } from '@/lib/suivi';

/** Lien des e-mails de prospection : note le clic, garde le jeton, puis ouvre l'accueil. */
export default function Decouvrir() {
  const { jeton } = useParams<{ jeton: string }>();
  const router = useRouter();
  useEffect(() => {
    void (async () => {
      if (/^[0-9a-f-]{36}$/i.test(jeton)) {
        memoriserJeton(jeton);
        await source().admin.prospection.noterVisite(jeton, 'clic', '/').catch(() => undefined);
      }
      router.replace('/');
    })();
  }, [jeton, router]);
  return <div className={p.page} aria-busy />;
}
