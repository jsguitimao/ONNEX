# =============================================================================
# Onnex — imagem de produção para VPS (Next.js 16 standalone)
#
# Build (feito pelo deploy.sh a partir da RAIZ do repo):
#   docker compose -f deploy/docker-compose.yml build app
#
# Estágios:
#   deps    — instala node_modules (inclui `prisma generate` via postinstall)
#   builder — next build (gera .next/standalone)
#   runner  — imagem final mínima, corre server.js como utilizador não-root
# =============================================================================

FROM node:22-alpine AS deps
WORKDIR /app
# prisma/ tem de existir antes do npm ci: o postinstall corre `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* são inlined no bundle DURANTE o build — têm de vir como args.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ARG SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    SENTRY_DSN=$SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN npm run build

# Estágio auxiliar só para migrações (tem o Prisma CLI + schema).
# Usado pelo deploy.sh: docker compose run --rm migrate
FROM deps AS migrator
WORKDIR /app
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
