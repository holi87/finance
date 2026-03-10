# Budget Tracker — Prompty wykonawcze per etap

## Jak używać
Każdy prompt poniżej jest osobnym promptem dla agenta implementacyjnego.

Nie wrzucaj wszystkiego naraz. Wysyłaj etapami i pilnuj, żeby po każdym etapie repo było spójne i uruchamialne.

---

## Prompt 1 — foundation repo

Zbuduj fundament monorepo dla projektu budget tracker.

Wymagania:
- pnpm workspaces,
- katalogi `apps/web`, `apps/api`, `packages/ui`, `packages/shared-types`, `packages/shared-validation`, `packages/sync-engine`, `packages/config`, `infra/docker`, `docs`, `.github/workflows`,
- wspólny TypeScript config,
- ESLint,
- Prettier,
- podstawowe skrypty root,
- README startowe,
- sensowne `.gitignore`,
- czytelna struktura bez zbędnych plików.

Kryteria akceptacji:
- repo jest spójne,
- pnpm install działa,
- lint/typecheck można uruchomić,
- struktura odpowiada dokumentacji.

---

## Prompt 2 — backend foundation

Zaimplementuj fundament backendu w NestJS dla budget trackera.

Wymagania:
- konfiguracja `apps/api`,
- NestJS z modularnym układem,
- env parsing,
- health endpoint,
- integracja z PostgreSQL,
- Prisma schema i pierwsze migracje,
- przygotowanie modułów: auth, users, workspaces, memberships, accounts, categories, transactions, budgets, sync,
- brak logiki biznesowej w kontrolerach,
- podstawowe testy startowe.

Kryteria akceptacji:
- backend startuje,
- `/health` działa,
- Prisma działa,
- baza łączy się poprawnie,
- struktura modułów jest modularna.

---

## Prompt 3 — auth i workspace

Zaimplementuj auth i workspace management.

Wymagania:
- user model,
- logowanie,
- refresh token flow,
- hashowanie hasła Argon2,
- workspace model,
- memberships,
- role owner/editor/viewer,
- autoryzacja per workspace,
- endpointy: login, refresh, me, workspaces list/create/update, members list/add/update.

Kryteria akceptacji:
- użytkownik może się zalogować,
- może pobrać swoje workspace’y,
- role są egzekwowane.

---

## Prompt 4 — accounts, categories, transactions, budgets

Zaimplementuj główne moduły finansowe.

Wymagania:
- accounts CRUD,
- categories CRUD,
- transactions CRUD,
- business endpoint transfer,
- budget periods i budget limits,
- walidacja DTO,
- filtrowanie danych po workspace,
- soft delete,
- versioning rekordów pod sync.

Kryteria akceptacji:
- podstawowe operacje finansowe działają,
- dane są izolowane per workspace,
- rekordy mają version/updatedAt/deletedAt.

---

## Prompt 5 — frontend foundation

Zaimplementuj frontend PWA w React + TypeScript + Vite.

Wymagania:
- routing,
- app shell,
- podstawowy layout,
- login screen,
- workspace switcher,
- dashboard skeleton,
- status synchronizacji,
- mobile-first layout,
- PWA bootstrap,
- wspólne komponenty UI,
- brak nadmiernego global state.

Kryteria akceptacji:
- frontend startuje,
- UI działa na mobile i desktop,
- podstawowe widoki istnieją,
- aplikacja jest gotowa pod local storage.

---

## Prompt 6 — local storage i offline foundation

Dodaj warstwę offline-first po stronie klienta.

Wymagania:
- IndexedDB przez Dexie,
- lokalne tabele dla workspace, accounts, categories, transactions, budgets, outbox, sync metadata,
- repozytoria lokalne,
- UI czyta dane z lokalnej bazy,
- bootstrap danych po logowaniu,
- bezpieczne czyszczenie danych przy wylogowaniu.

Kryteria akceptacji:
- dane mogą istnieć lokalnie,
- UI nie zależy bezpośrednio od ciągłego połączenia,
- struktura storage jest modularna.

---

## Prompt 7 — sync engine

Zaimplementuj podstawowy silnik synchronizacji.

Wymagania:
- outbox pattern,
- tworzenie operacji create/update/delete,
- `POST /sync/push`,
- `GET /sync/pull`,
- cursor-based sync,
- retry logic,
- blokada równoległego sync,
- aktualizacja lokalnej bazy po push/pull,
- status synchronizacji w UI.

Kryteria akceptacji:
- zmiany lokalne są kolejkowane,
- po odzyskaniu sieci dane synchronizują się,
- podstawowy konflikt wersji jest obsłużony.

---

## Prompt 8 — Docker i GitHub Actions

Dodaj warstwę uruchomieniową i CI.

Wymagania:
- Dockerfile dla web,
- Dockerfile dla api,
- docker-compose,
- postgres service,
- reverse proxy,
- `.env.example`,
- GitHub Actions dla lint/typecheck/test/build/docker build,
- README z instrukcją uruchomienia.

Kryteria akceptacji:
- cały system uruchamia się przez compose,
- CI przechodzi,
- obrazy Docker budują się poprawnie.

---

## Prompt 9 — hardening i porządki końcowe

Zrób porządki produkcyjne i stabilizację.

Wymagania:
- poprawa błędów i edge case’ów,
- uzupełnienie testów,
- lepsza obsługa empty/error/loading/offline states,
- przegląd architektury pod kątem dużych klas i złych zależności,
- dopięcie README i docs,
- upewnienie się, że projekt jest czytelny dla kolejnych iteracji.

Kryteria akceptacji:
- projekt jest spójny,
- architektura nie dryfuje w monolit,
- najważniejsze ścieżki są dopracowane,
- repo nadaje się do dalszego rozwoju.

---

## Wskazówki dla agenta
- nie twórz wielkich plików i klas,
- dziel logikę per feature i per moduł,
- trzymaj się dokumentacji projektu,
- po każdym etapie zostaw repo w stanie uruchamialnym,
- nie upraszczaj offline-first do samego cache assetów,
- traktuj sync jako element rdzeniowy projektu.

