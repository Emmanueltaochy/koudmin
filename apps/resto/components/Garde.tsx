'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { connecte } from '@/lib/auth';

/** Redirige vers la connexion sans session (Supabase). En démonstration, laisse passer. */
export function Garde({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    void connecte().then((c) => (c ? setOk(true) : router.replace('/connexion')));
  }, [router]);
  return ok ? <>{children}</> : null;
}
