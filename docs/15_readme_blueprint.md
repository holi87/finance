# Budget Tracker — README blueprint

## 1. Projekt
Budget Tracker to aplikacja offline-first do zarządzania wieloma przestrzeniami budżetowymi.

Obsługuje przykładowo:
- budżet domowy,
- JDG,
- spółkę,
- budżet współdzielony.

Aplikacja działa jako:
- web app,
- PWA na iPhonie,
- system z lokalną pracą offline i synchronizacją z centralnym backendem.

## 2. Stack
### Frontend
- React
- TypeScript
- Vite
- Tailwind
- Dexie / IndexedDB
- PWA plugin

### Backend
- Node.js
- NestJS
- PostgreSQL
- Prisma

### Infra
- Docker
- Docker Compose
- Caddy
- GitHub Actions

## 3. Struktura repo
```text
apps/
  web/
  api/
packages/
  ui/
  shared-types/
  shared-validation/
  sync-engine/
  config/
infra/
  docker/
docs/
.github/workflows/
```

## 4. Wymagania lokalne
- Node.js w sensownej stabilnej wersji LTS,
- pnpm,
- Docker,
- Docker Compose.

## 5. Start projektu
### Instalacja zależności
```bash
pnpm install
```

### Uruchomienie development
Przykładowo:
```bash
docker compose up -d postgres
pnpm dev
```

lub całość przez compose, jeśli projekt to wspiera.

### Uruchomienie pełne
```bash
docker compose up --build
```

## 6. Zmienne środowiskowe
Należy przygotować `.env` na bazie `.env.example`.

Przykładowe zmienne:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_BASE_URL`
- `API_BASE_URL`
- `NODE_ENV`

## 7. Skrypty
Przykładowe skrypty root:
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm format`

## 8. Migracje bazy
Przykładowy flow:
```bash
pnpm --filter api prisma migrate dev
pnpm --filter api prisma generate
```

## 9. Docker
Projekt powinien dostarczać:
- Dockerfile dla web,
- Dockerfile dla api,
- docker-compose,
- trwały wolumen dla postgres,
- reverse proxy.

## 10. CI
GitHub Actions powinny wykonywać:
- lint,
- typecheck,
- test,
- build,
- docker build.

## 11. Architektura i dokumentacja
Kluczowe dokumenty znajdują się w `docs/`.

Minimalny zestaw:
- plan projektu,
- architektura,
- model domenowy,
- sync protocol,
- database schema,
- docker setup,
- github actions,
- roadmapa MVP,
- API contract,
- UI/UX spec,
- security and backup.

## 12. Zasady rozwoju
- zachowuj modularność,
- unikaj wielkich klas i plików,
- trzymaj logikę per feature,
- nie łam izolacji workspace,
- traktuj offline-first i sync jako rdzeń produktu.

## 13. Status projektu
README powinien jasno opisywać:
- co działa,
- co jest MVP,
- co jest planned,
- jak uruchomić projekt,
- jak wdrożyć projekt.

## 14. Checklist dla pierwszego uruchomienia
- skopiuj `.env.example` do `.env`,
- uruchom bazę,
- wykonaj migracje,
- uruchom backend,
- uruchom frontend,
- zaloguj się lub załaduj seed,
- sprawdź health endpoint,
- sprawdź działanie offline.

## 15. Definicja dobrego README
README jest gotowe, gdy nowa osoba może:
- zrozumieć cel projektu,
- uruchomić projekt lokalnie,
- znaleźć dokumentację,
- zrozumieć stack i strukturę,
- wiedzieć, jak wejść w dalszy development.

