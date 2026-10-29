import type { NextConfig } from 'next';

const config: NextConfig = {
  // Les paquets du monorepo sont publiés en TypeScript source.
  transpilePackages: ['@kivien/core', '@kivien/ui-tokens'],
  poweredByHeader: false,
};

export default config;
