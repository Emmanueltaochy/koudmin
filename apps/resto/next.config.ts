import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Les paquets du monorepo sont publiés en TypeScript source.
  transpilePackages: ['@kivien/core', '@kivien/ui-tokens'],
  poweredByHeader: false,
  // Image Docker du VPS (deploy/vps/site/Dockerfile) : serveur autonome, traçage depuis la racine du dépôt.
  ...(process.env.KIVIEN_STANDALONE
    ? { output: 'standalone' as const, outputFileTracingRoot: path.join(process.cwd(), '../..') }
    : {}),
};

export default config;
