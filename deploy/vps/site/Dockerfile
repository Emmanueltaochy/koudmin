# syntax=docker/dockerfile:1
# Site kivien.re (Next.js, mode standalone) et app extra en version web (app.kivien.re).
# Contexte : la racine du dépôt.
#   site : docker build -f deploy/vps/site/Dockerfile --target site -t kivien-site .
#   app  : docker build -f deploy/vps/site/Dockerfile --target app-web --output type=local,dest=<dossier> .
# Les URL et clé publique Supabase sont intégrées au moment du build (variables NEXT_PUBLIC_ / EXPO_PUBLIC_).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1 NEXT_TELEMETRY_DISABLED=1 EXPO_NO_TELEMETRY=1
# Certificat racine supplémentaire, facultatif (secret de build « ca ») : utile derrière un proxy
# d'entreprise ; sur le VPS, aucun secret n'est fourni et rien ne change.
RUN corepack enable && printf '#!/bin/sh\n[ -f /run/secrets/ca ] && export NODE_EXTRA_CA_CERTS=/run/secrets/ca\nexec "$@"\n' > /usr/local/bin/avec-ca && chmod +x /usr/local/bin/avec-ca
WORKDIR /depot

# Dépendances seules : cette couche ne change que si un package.json ou le lockfile change.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/resto/package.json apps/resto/
COPY apps/extra/package.json apps/extra/
COPY packages/core/package.json packages/core/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY packages/brand/package.json packages/brand/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store --mount=type=secret,id=ca,required=false avec-ca pnpm install --frozen-lockfile

FROM deps AS source
COPY . .
RUN --mount=type=secret,id=ca,required=false avec-ca pnpm --filter @kivien/ui-tokens build

# --- Site ---------------------------------------------------------------------
FROM source AS site-build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    KIVIEN_STANDALONE=1
RUN --mount=type=secret,id=ca,required=false avec-ca pnpm --filter @kivien/resto build

FROM node:22-bookworm-slim AS site
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=site-build --chown=node:node /depot/apps/resto/.next/standalone ./
COPY --from=site-build --chown=node:node /depot/apps/resto/.next/static ./apps/resto/.next/static
COPY --from=site-build --chown=node:node /depot/apps/resto/public ./apps/resto/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/resto/server.js"]

# --- App extra, version web (fichiers statiques servis par nginx) ---------------
FROM source AS app-build
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
RUN --mount=type=secret,id=ca,required=false avec-ca pnpm --filter @kivien/extra export:web

FROM scratch AS app-web
COPY --from=app-build /depot/apps/extra/dist /
