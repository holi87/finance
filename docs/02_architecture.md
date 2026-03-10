# Budget Tracker — Architektura rozwiązania

## 1. Styl architektury
System powinien być zaprojektowany jako:
- **offline-first** po stronie klienta,
- **centralized sync backend** po stronie serwera,
- **modular monolith** na start po stronie API,
- **monorepo** na poziomie repozytorium.

To daje dobry balans między prostotą wdrożenia a możliwością dalszego rozwoju.

## 2. Architektura wysokiego poziomu
Główne warstwy:
1. klient web/PWA,
2. lokalna baza danych w urządzeniu,
3. silnik synchronizacji,
4. backend API,
5. centralna baza PostgreSQL.

Przepływ działania:
- użytkownik wykonuje operację w UI,
- operacja trafia do lokalnej bazy,
- UI od razu pokazuje wynik,
- operacja trafia do outboxa synchronizacji,
- po dostępności sieci klient wysyła zmiany do backendu,
- backend zapisuje dane i zwraca potwierdzenie,
- klient pobiera zdalne zmiany od ostatniego kursora synchronizacji.

## 3. Architektura klienta
Klient działa jako PWA i jako klasyczna aplikacja webowa.

### Odpowiedzialności klienta
- renderowanie UI,
- obsługa logowania,
- obsługa lokalnego modelu danych,
- działanie offline,
- zapisywanie zmian lokalnie,
- kolejkowanie zmian do synchronizacji,
- wykonywanie synchronizacji push/pull,
- prezentacja statusu synchronizacji użytkownikowi.

### Główne moduły klienta
- app-shell,
- auth,
- workspace-switcher,
- dashboard,
- accounts,
- categories,
- transactions,
- budgets,
- reports,
- settings,
- sync-status,
- local-storage,
- sync-engine,
- api-client.

## 4. Lokalna baza danych
Lokalna baza w urządzeniu jest niezbędna do działania offline.

Powinna przechowywać:
- workspaces,
- memberships,
- accounts,
- categories,
- transactions,
- budgets,
- metadata synchronizacji,
- kolejkę outbox,
- stan urządzenia,
- lokalne snapshoty potrzebne do odczytu UI.

Zasada projektowa:
UI czyta przede wszystkim z lokalnej bazy, a nie bezpośrednio z API.

## 5. Silnik synchronizacji
Synchronizacja powinna być wydzielona do osobnego modułu.

### Odpowiedzialności
- śledzenie zmian lokalnych,
- budowanie operacji synchronizacyjnych,
- wysyłanie operacji na backend,
- pobieranie zmian z backendu,
- aktualizacja lokalnej bazy po syncu,
- oznaczanie konfliktów,
- obsługa retry,
- utrzymywanie kursora synchronizacji.

### Strategia synchronizacji
Model rekomendowany:
- **push lokalnych zmian**,
- **pull zdalnych zmian**,
- **cursor-based sync**,
- **outbox pattern**.

### Moment synchronizacji
- przy starcie aplikacji,
- po odzyskaniu połączenia,
- po odzyskaniu focusu aplikacji,
- po ręcznym kliknięciu „Synchronizuj teraz”,
- opcjonalnie cyklicznie podczas aktywnej sesji.

## 6. Konflikty danych
W MVP należy przyjąć prosty model konfliktów.

### Mechanizmy techniczne
Każdy rekord powinien posiadać:
- id,
- version,
- updatedAt,
- createdAt,
- deviceId,
- deletedAt albo soft delete marker.

### Strategia MVP
- dla prostych edycji: last-write-wins,
- dla usunięć i kolizji wersji: oznaczenie konfliktu i bezpieczna obsługa po stronie klienta,
- dla rozwoju późniejszego: możliwość dodania jawnego conflict-resolution flow.

## 7. Architektura backendu
Backend powinien być modularnym monolitem.

### Powody
- prostsze wdrożenie,
- prostszy Docker,
- mniejsza złożoność operacyjna,
- wystarczająca skalowalność na ten etap,
- czytelny podział domenowy bez kosztu mikroserwisów.

### Moduły backendu
- auth,
- users,
- workspaces,
- memberships,
- accounts,
- categories,
- transactions,
- budgets,
- reports,
- sync,
- audit,
- health.

Każdy moduł powinien mieć własne:
- kontrolery,
- serwisy,
- DTO,
- walidację,
- mapowanie,
- testy.

## 8. API
API powinno być jawnie kontraktowe i wersjonowane.

### Główne grupy endpointów
- `/auth/*`
- `/workspaces/*`
- `/accounts/*`
- `/categories/*`
- `/transactions/*`
- `/budgets/*`
- `/reports/*`
- `/sync/push`
- `/sync/pull`
- `/health`

Na start preferowany styl:
- REST dla CRUD i raportów,
- dedykowane endpointy sync dla synchronizacji.

## 9. Autoryzacja i separacja danych
Każde żądanie związane z danymi biznesowymi musi być walidowane pod kątem:
- tożsamości użytkownika,
- przynależności do workspace,
- roli w danym workspace.

Nie wolno opierać uprawnień tylko na filtrach w UI.

## 10. Architektura danych
Centralna baza PostgreSQL przechowuje pełny stan systemu i historię zmian potrzebną do synchronizacji.

Podejście:
- tabele domenowe,
- indeksy pod najczęstsze odczyty,
- soft delete tam, gdzie to uzasadnione,
- wersjonowanie rekordów pod sync,
- metadata synchronizacji per urządzenie lub per użytkownik.

## 11. Architektura PWA
PWA powinno mieć:
- manifest,
- service worker,
- cache app shell,
- cache statycznych assetów,
- bezpieczną strategię odświeżania aplikacji,
- czytelny onboarding instalacji na iPhonie.

### Realistyczne ograniczenia iPhone PWA
Na iPhonie nie należy zakładać niezawodnego pełnego background sync przy zamkniętej aplikacji.

Dlatego architektura powinna opierać się na:
- sync przy aktywnej aplikacji,
- trwałym outboxie,
- jawnej informacji o stanie synchronizacji,
- możliwości ręcznego wymuszenia synchronizacji.

## 12. Architektura wdrożenia
Docelowy deployment:
- `web` — frontend serwowany jako statyczna aplikacja,
- `api` — backend aplikacyjny,
- `postgres` — baza danych,
- `reverse-proxy` — np. Caddy.

Połączenia:
- reverse proxy kieruje ruch do web i api,
- api łączy się z postgres po prywatnej sieci dockera,
- dane postgres trzymane na wolumenie.

## 13. Zasady architektoniczne
Najważniejsze zasady:
- separation of concerns,
- modularność,
- małe odpowiedzialności modułów,
- brak wielkich klas usługowych,
- kontrakty między warstwami,
- brak zależności cyklicznych,
- czytelna granica między domeną, transportem i infrastrukturą,
- offline-first jako wymaganie rdzeniowe, a nie dodatek.

## 14. Rekomendacja końcowa
Najlepsza architektura dla tego projektu to:
- React + TypeScript + PWA po stronie klienta,
- IndexedDB jako lokalny store,
- osobny sync engine,
- NestJS jako modularny backend,
- PostgreSQL jako centralna baza,
- Docker Compose do uruchomienia,
- monorepo z wyraźnym podziałem odpowiedzialności.