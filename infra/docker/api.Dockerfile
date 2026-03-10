FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-validation/package.json packages/shared-validation/package.json
COPY packages/sync-engine/package.json packages/sync-engine/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @finance/config build \
  && pnpm --filter @finance/shared-types build \
  && pnpm --filter @finance/shared-validation build \
  && pnpm --filter @finance/sync-engine build \
  && pnpm --filter api exec prisma generate \
  && pnpm --filter api build

FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages ./packages
COPY --from=build /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=build /app/packages/shared-validation/node_modules ./packages/shared-validation/node_modules

ENV NODE_ENV=production
EXPOSE 3001

USER nodeuser

CMD ["node", "apps/api/dist/main.js"]
