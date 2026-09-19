FROM node:24-alpine AS base

# Dependencies are installed in the builder stage itself: a separate deps
# stage made BuildKit copy the whole node_modules tree between stages
# (~6-12 min on the CD runner) every time the lockfile changed.
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY patches ./patches

RUN --mount=type=secret,id=hugeicons_token \
    --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
    corepack enable pnpm && \
    if [ -f /run/secrets/hugeicons_token ]; then \
      echo "@hugeicons-pro:registry=https://npm.hugeicons.com" > .npmrc && \
      echo "//npm.hugeicons.com/:_authToken=$(cat /run/secrets/hugeicons_token)" >> .npmrc; \
    fi && \
    pnpm install --frozen-lockfile && \
    rm -f .npmrc

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_URL=https://nexo.coodee.dev
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL

ARG NEXT_PUBLIC_AXIOM_TOKEN
ENV NEXT_PUBLIC_AXIOM_TOKEN=$NEXT_PUBLIC_AXIOM_TOKEN

ARG NEXT_PUBLIC_AXIOM_DATASET
ENV NEXT_PUBLIC_AXIOM_DATASET=$NEXT_PUBLIC_AXIOM_DATASET

ARG NEXT_PUBLIC_REALTIME_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
# `next build` imports every route module to collect its metadata, which
# evaluates app/jobs/[[...workbench]]/route.ts's top-level `workbench({...})`
# call — it throws immediately without a redis config (real or not), since
# this build stage has no Redis to connect to. A syntactically valid but
# unreachable URL is enough; nothing actually connects until runtime.
ENV REDIS_URL="redis://localhost:6379"
ENV SKIP_ENV_VALIDATION="true"

RUN --mount=type=cache,target=/app/.next/cache \
    corepack enable pnpm && \
    pnpm prisma:generate && \
    pnpm build && \
    pnpm worker:build && \
    pnpm realtime:build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# node:24-alpine can lag behind Alpine security fixes (e.g. openssl
# CVE-2026-31789), which fails the Trivy gate in cd.yml. Pull the patched
# packages into the image that actually ships.
RUN apk upgrade --no-cache libcrypto3 libssl3

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# The runtime image only ever runs `node server.js` — it never invokes npm,
# npx or corepack. Strip them so vulnerabilities in the base image's bundled
# npm (e.g. its vendored node-tar) don't fail the Trivy gate in cd.yml for a
# binary we don't ship functionality with.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
