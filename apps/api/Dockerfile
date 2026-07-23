# Build de contexto na RAIZ do monorepo (Railway: Root Directory = ".",
# Dockerfile Path = "apps/api/Dockerfile") — precisa dos workspaces inteiros
# pra "pnpm install" resolver @qa-ai/shared (workspace:*).

FROM node:20-slim
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @qa-ai/shared build \
 && pnpm --filter @qa-ai/api exec prisma generate \
 && pnpm --filter @qa-ai/api build

# Chromium + libs de sistema exigidas pelo crawler Playwright.
RUN pnpm --filter @qa-ai/api exec playwright install --with-deps chromium

WORKDIR /repo/apps/api
RUN mkdir -p storage
ENV NODE_ENV=production
EXPOSE 3333
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
