# Budget Tracker — Master Prompt dla agenta implementacyjnego

Ten plik zawiera jeden główny prompt, który można przekazać agentowi kodującemu (np. Codex, GPT‑o, Claude Code), aby zbudował repozytorium projektu zgodnie z całą dokumentacją.

Prompt zakłada, że wszystkie dokumenty architektoniczne znajdują się w katalogu `docs/` i stanowią źródło prawdy dla projektu.

---

# MASTER PROMPT

Jesteś agentem implementującym projekt software.

Twoim zadaniem jest zbudowanie repozytorium aplikacji **Budget Tracker** zgodnie z dokumentacją projektu.

## 1. Najważniejsza zasada

Dokumentacja w katalogu `docs/` jest **źródłem prawdy**.

Zawiera ona m.in.:

- plan projektu
- architekturę
- model domenowy
- schemat bazy danych
- kontrakt API
- protokół synchronizacji
- specyfikację UI/UX
- konfigurację Docker
- strategię CI/CD
- strategię testów
- runbook wdrożeniowy
- checklistę realizacji projektu

Zawsze sprawdzaj dokumentację przed implementacją.

Jeśli kontekst rozmowy zostanie skrócony, odczytaj ponownie dokumenty z `docs/`.

---

# 2. Cel projektu

Zbuduj aplikację do zarządzania budżetami działającą jako:

- aplikacja web
- PWA na iPhone
- system offline‑first
- aplikacja synchronizująca dane z backendem

Aplikacja obsługuje wiele workspace:

- budżet domowy
- JDG
- spółka
- budżet współdzielony

Każdy workspace ma osobne:

- konta
- kategorie
- transakcje
- budżety

---

# 3. Stack technologiczny

Frontend:

- React
- TypeScript
- Vite
- Tailwind
- IndexedDB (Dexie)
- PWA

Backend:

- Node.js
- NestJS
- PostgreSQL
- Prisma

Infra:

- Docker
- Docker Compose
- Caddy
- GitHub Actions

Architektura:

- monorepo
- modularny backend
- offline‑first klient
- synchronizacja push/pull

---

# 4. Struktura repo

Repozytorium musi mieć strukturę:

```
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

.github/workflows/

docs/
```

Nie zmieniaj tej struktury bez powodu.

---

# 5. Zasady implementacji

Podczas implementacji:

- trzymaj logikę per feature
- unikaj wielkich plików
- unikaj monolitycznych klas
- stosuj modularną architekturę
- nie mieszaj warstw
- backend nie może mieć logiki w kontrolerach

Każdy moduł powinien być:

- czytelny
- mały
- łatwy do testowania

---

# 6. Offline‑first

Aplikacja musi działać offline.

Frontend powinien:

- przechowywać dane w IndexedDB
- zapisywać operacje w outbox
- synchronizować dane z backendem

Backend jest source of truth.

Synchronizacja działa przez:

```
push
pull
cursor
version
```

Dokładne zasady są w `sync-protocol.md`.

---

# 7. API

Backend musi implementować endpointy zgodne z:

`api-contract.md`

Obejmują one:

- auth
- users
- workspaces
- accounts
- categories
- transactions
- budgets
- reports
- sync

API musi być:

- wersjonowane
- walidowane
- zabezpieczone

---

# 8. Baza danych

Schemat bazy musi być zgodny z:

`database-schema.md`

Zawiera m.in.:

- users
- workspaces
- memberships
- accounts
- categories
- transactions
- budgets
- sync tables

Każda encja musi mieć:

- id
- workspaceId
- createdAt
- updatedAt
- version
- deletedAt

---

# 9. UI

UI musi być zgodne z:

`ui-ux-spec.md`

Najważniejsze widoki:

- login
- dashboard
- transactions
- accounts
- categories
- budgets
- settings

UI musi być:

- mobile‑first
- szybkie
- czytelne
- proste

---

# 10. Docker

Projekt musi być uruchamialny przez:

```
docker compose up
```

Usługi:

- web
- api
- postgres
- caddy

Konfiguracja zgodna z:

`docker-setup.md`

---

# 11. CI/CD

Repo musi zawierać GitHub Actions:

- lint
- typecheck
- test
- build
- docker build

Konfiguracja zgodna z:

`github-actions.md`

---

# 12. Testy

Projekt musi zawierać:

- testy jednostkowe
- testy integracyjne
- podstawowe e2e

Zgodnie z:

`testing-strategy.md`

---

# 13. Deployment

Projekt musi być możliwy do wdrożenia na:

Mac Mini M4

z Docker Compose.

Instrukcja znajduje się w:

`deployment-runbook.md`

---

# 14. Workflow pracy

Podczas pracy nad projektem:

1. Implementuj funkcje etapami.
2. Po każdej większej zmianie wykonaj commit.
3. Aktualizuj **Changelog w README przed commitem**.
4. Repo zawsze musi się budować.

Nie zostawiaj repo w stanie niespójnym.

---

# 15. Kolejność implementacji

Buduj projekt etapami:

1.
foundation repo

2.
backend foundation

3.
auth + workspace

4.
accounts/categories/transactions

5.
frontend foundation

6.
offline storage

7.
sync engine

8.
docker + CI

9.
hardening

Szczegóły w:

`mvp-roadmap.md`

---

# 16. Definicja sukcesu

Projekt jest gotowy gdy:

- działa jako web app
- działa jako PWA
- działa offline
- synchronizuje dane
- ma modularną architekturę
- daje się uruchomić przez Docker
- ma CI
- ma dokumentację

---

# 17. Najważniejsze zasady

Zawsze:

- sprawdzaj dokumentację
- pracuj iteracyjnie
- utrzymuj repo w stanie kompilowalnym
- dbaj o czytelność kodu
- nie upraszczaj synchronizacji

Offline‑first i sync są **rdzeniem projektu**.