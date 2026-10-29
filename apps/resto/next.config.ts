import type { NextConfig } from 'next';

const config: NextConfig = {
  // Les paquets du monorepo sont publiés en TypeScript source.
  transpilePackages: ['@koudmin/core', '@koudmin/ui-tokens'],
  poweredByHeader: false,
};

export default config;
