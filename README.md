# Budget Tracker

Offline-first aplikacja do zarządzania budżetami działająca jako web app i PWA na iPhonie. Projekt obsługuje wiele niezależnych workspace'ów, lokalny zapis w IndexedDB, outbox synchronizacji oraz backend API zbudowany w NestJS i Prisma.

## Co działa

- monorepo `pnpm` z `apps/`, `packages/`, `infra/` i `.github/workflows/`
- frontend React + Vite + Tailwind + Dexie + PWA
- backend NestJS + Prisma + JWT access/refresh
- workspace isolation z rolami `owner`, `editor`, `viewer`
- CRUD MVP dla kont, kategorii, transakcji i budżetów
- dashboard i podstawowe raporty
- local-first zapis na froncie z outboxem i sync `push/pull`
- Docker, Caddy i GitHub Actions pod lint/typecheck/test/build/docker build

## Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Dexie / IndexedDB
- vite-plugin-pwa

### Backend

- NestJS
- Prisma
- PostgreSQL
- JWT + refresh token rotation
- Argon2

### Infra

- Docker
- Docker Compose
- Caddy
- GitHub Actions

## Struktura repo

```text
apps/
  api/
  web/
packages/
  config/
  shared-types/
  shared-validation/
  sync-engine/
  ui/
infra/
  docker/
docs/
.github/workflows/
```

## Wymagania lokalne

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose
- PostgreSQL lub `docker compose up`

## Start projektu

1. Skopiuj `.env.example` do `.env`
2. Uruchom bazę:

```bash
docker compose up -d postgres
```

3. Wygeneruj Prisma Client i migracje/schema:

```bash
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma db push
pnpm db:seed
```

4. Uruchom development:

```bash
pnpm dev
```

Frontend: [http://localhost:5173](http://localhost:5173)  
API: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)  
Health: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

## Demo login

- email: `demo@budget.local`
- hasło: `demo12345`

## Docker

Pełny stack:

```bash
docker compose up --build
```

Główne pliki:

- `docker-compose.yml`
- `infra/docker/api.Dockerfile`
- `infra/docker/web.Dockerfile`
- `infra/docker/caddy/Caddyfile`

## Skrypty

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm db:generate`
- `pnpm db:push`
- `pnpm db:seed`

## Dokumentacja

Pełna dokumentacja architektury, domeny, syncu, bezpieczeństwa i wdrożenia znajduje się w `docs/`.

## Changelog

### 2026-03-10

- zbudowano monorepo offline-first z aplikacją web/PWA, API NestJS i współdzielonymi pakietami
- dodano local DB w Dexie, outbox synchronizacji, endpointy `sync/push` i `sync/pull`
- dodano Docker, Caddy, GitHub Actions i instrukcję uruchomienia projektu
