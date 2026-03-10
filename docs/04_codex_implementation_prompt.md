# Budget Tracker — Główny prompt wykonawczy dla agenta kodującego

## Rola
Jesteś agentem implementacyjnym odpowiedzialnym za wygenerowanie wysokiej jakości kodu dla aplikacji do śledzenia budżetów działającej jako web app i PWA na iPhonie.

Nie tworzysz demo. Tworzysz produkcyjny fundament projektu zgodny z architekturą offline-first.

## Cel projektu
Zaimplementuj pierwszą pełną bazę projektu dla aplikacji budżetowej obsługującej wiele workspace’ów finansowych:
- domowy,
- JDG,
- spółka,
- wspólny budżet z żoną.

Aplikacja ma:
- działać jako web app,
- działać jako PWA na iPhonie,
- wspierać działanie offline,
- synchronizować dane z centralnym backendem,
- być gotowa do uruchomienia przez Docker,
- być gotowa do budowania w GitHub Actions.

## Najważniejsze wymagania architektoniczne
- projekt w monorepo,
- frontend i backend rozdzielone,
- backend jako modularny monolit,
- frontend jako aplikacja feature-based,
- lokalna baza danych po stronie klienta,
- synchronizacja przez outbox + push/pull,
- brak monolitycznych klas i plików,
- jasny podział domeny, transportu i infrastruktury,
- pełne TypeScript,
- kod czytelny, modularny i testowalny.

## Rekomendowany stack
### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- IndexedDB przez Dexie
- PWA plugin
- Zod

### Backend
- Node.js
- NestJS
- PostgreSQL
- Prisma
- JWT + refresh token

### Repo / narzędzia
- pnpm workspaces
- ESLint
- Prettier
- Vitest
- Docker
- Docker Compose
- GitHub Actions

## Zadanie główne
Wygeneruj kompletny szkielet projektu z działającymi fundamentami dla:
1. monorepo,
2. aplikacji frontendowej,
3. aplikacji backendowej,
4. bazy PostgreSQL,
5. podstawowego modelu domenowego,
6. lokalnego storage na frontendzie,
7. prostego silnika synchronizacji,
8. Dockera,
9. CI w GitHub Actions,
10. README z instrukcją uruchomienia.

## Wymagania funkcjonalne MVP
### Uwierzytelnianie
- logowanie,
- odświeżanie sesji,
- bezpieczny model tokenów.

### Workspace
- użytkownik należy do wielu workspace’ów,
- może przełączać aktywny workspace,
- role: owner, editor, viewer.

### Konta
- tworzenie i listowanie kont,
- przypisanie do workspace.

### Kategorie
- tworzenie i listowanie kategorii,
- osobne kategorie per workspace.

### Transakcje
- tworzenie przychodu,
- tworzenie wydatku,
- tworzenie transferu,
- lista transakcji,
- filtrowanie po workspace.

### Budżety
- miesięczne limity kategorii,
- odczyt aktualnego wykorzystania.

### Offline
- lokalny zapis do IndexedDB,
- odczyt danych z lokalnej bazy,
- kolejkowanie zmian w outbox,
- synchronizacja po odzyskaniu połączenia.

## Wymagania techniczne szczegółowe
### Monorepo
Utwórz strukturę:
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

### Frontend
Zaimplementuj:
- podstawowy shell aplikacji,
- routing,
- ekran logowania,
- przełącznik workspace,
- dashboard,
- ekran listy transakcji,
- formularz dodania transakcji,
- status synchronizacji,
- lokalne repozytoria w IndexedDB,
- podstawową integrację z API.

### Backend
Zaimplementuj moduły:
- auth,
- users,
- workspaces,
- memberships,
- accounts,
- categories,
- transactions,
- budgets,
- sync,
- health.

### Synchronizacja
Przygotuj prosty model:
- lokalna zmiana zapisuje rekord lokalnie,
- operacja trafia do outbox,
- klient wysyła paczkę operacji do `/sync/push`,
- klient pobiera zmiany przez `/sync/pull`,
- backend utrzymuje kursor lub wersję zmian,
- rekordy mają version i updatedAt.

### API
Przygotuj endpointy REST dla CRUD MVP oraz:
- `POST /sync/push`
- `GET /sync/pull`
- `GET /health`

### Baza danych
Zaprojektuj schemat dla:
- users,
- workspaces,
- memberships,
- accounts,
- categories,
- transactions,
- budgets,
- sync_changes lub równoważnej tabeli zdarzeń synchronizacyjnych.

## Wymagania jakościowe
- pełne typowanie,
- brak `any`, jeśli nie jest absolutnie konieczne,
- małe i spójne moduły,
- sensowne nazwy,
- brak nadmiernych abstrakcji,
- brak logiki biznesowej w kontrolerach,
- walidacja wejścia,
- podstawowe testy jednostkowe i integracyjne,
- gotowość do dalszej rozbudowy bez przepisywania fundamentów.

## Wymagania Docker
Przygotuj:
- Dockerfile dla web,
- Dockerfile dla api,
- `docker-compose.yml` dla lokalnego uruchomienia,
- kontener postgres,
- zmienne środowiskowe przez `.env.example`,
- healthcheck tam, gdzie to ma sens.

## Wymagania CI/CD
Przygotuj GitHub Actions dla:
- lint,
- typecheck,
- test,
- build,
- budowy obrazów Docker.

## Oczekiwana struktura implementacji
Każdy moduł backendu powinien mieć czytelny podział na:
- controller,
- service,
- dto,
- repository lub adapter bazy,
- validation,
- tests.

Frontend powinien być zorganizowany per feature, a nie wokół ogólnego katalogu komponentów.

## Kryteria akceptacji
Uznam zadanie za wykonane, gdy:
- projekt uruchamia się przez Docker Compose,
- backend startuje i łączy się z PostgreSQL,
- frontend działa jako aplikacja webowa,
- frontend ma podstawy PWA,
- możliwe jest logowanie,
- możliwe jest utworzenie i przełączenie workspace,
- możliwe jest dodanie transakcji,
- dane zapisują się lokalnie,
- synchronizacja push/pull działa w podstawowym zakresie,
- projekt przechodzi lint, typecheck i testy,
- repo ma README i sensowną strukturę.

## Definicja gotowości
Dostarcz:
- kompletną strukturę repo,
- pliki konfiguracyjne,
- kod frontendu,
- kod backendu,
- schemat bazy,
- migracje,
- Dockerfile i compose,
- workflow GitHub Actions,
- README,
- przykładowe `.env.example`.

## Ograniczenia
- nie używaj mikroserwisów,
- nie używaj nadmiarowych bibliotek stanowych, jeśli nie są potrzebne,
- nie buduj wszystkiego w jednym module,
- nie implementuj zbyt skomplikowanego rozwiązywania konfliktów na MVP,
- nie rób architektury zależnej od stałego połączenia sieciowego.

## Sposób pracy
Pracuj etapami:
1. wygeneruj strukturę repo i konfigurację,
2. wygeneruj backend i bazę,
3. wygeneruj frontend,
4. wygeneruj offline storage i sync,
5. wygeneruj Docker i GitHub Actions,
6. uzupełnij README i dokumentację startową.

Każdy etap ma pozostawić repo w spójnym i uruchamialnym stanie.