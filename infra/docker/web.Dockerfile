FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable

ARG VITE_API_BASE_URL=http://localhost:3001/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
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
  && pnpm --filter @finance/ui build \
  && pnpm --filter web build

FROM nginx:1.29-alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY infra/docker/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
