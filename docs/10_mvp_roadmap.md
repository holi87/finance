# Budget Tracker — Roadmapa MVP krok po kroku

## 1. Cel roadmapy
Roadmapa ma prowadzić od pustego repo do działającego MVP w kontrolowanych, logicznych etapach.

Każdy etap powinien zostawiać projekt w stanie:
- spójnym,
- uruchamialnym,
- możliwym do przetestowania,
- gotowym do dalszej rozbudowy.

## 2. Etap 0 — decyzje startowe
Przed implementacją należy potwierdzić lub przyjąć domyślnie:
- jedną walutę per workspace,
- osobne kategorie per workspace,
- role owner/editor/viewer,
- miesięczne budżety na start,
- brak załączników i importu CSV w MVP,
- prosty conflict handling,
- offline-first jako wymaganie główne.

## 3. Etap 1 — fundament repo i narzędzi
Zakres:
- utworzenie monorepo,
- konfiguracja pnpm,
- wspólne tsconfig,
- ESLint i Prettier,
- podstawowe skrypty,
- README startowe,
- struktura apps/packages/docs/infra.

Rezultat:
- repo gotowe do pracy,
- spójny standard kodu,
- wspólny tooling.

## 4. Etap 2 — backend foundation
Zakres:
- inicjalizacja NestJS,
- konfiguracja env,
- integracja z PostgreSQL,
- konfiguracja Prisma,
- health endpoint,
- podstawowe moduły techniczne,
- pierwsza migracja bazy.

Rezultat:
- backend uruchamia się,
- łączy się z bazą,
- ma fundament pod dalsze moduły.

## 5. Etap 3 — auth i workspace
Zakres:
- user model,
- auth module,
- JWT access/refresh,
- workspace model,
- memberships,
- role-based access,
- podstawowe endpointy workspace.

Rezultat:
- użytkownik może się zalogować,
- może mieć wiele workspace’ów,
- backend kontroluje dostęp.

## 6. Etap 4 — model finansowy MVP
Zakres:
- accounts,
- categories,
- transactions,
- budgets,
- walidacja DTO,
- podstawowe operacje CRUD,
- filtrowanie per workspace.

Rezultat:
- backend umie obsłużyć podstawowe procesy finansowe.

## 7. Etap 5 — frontend foundation
Zakres:
- inicjalizacja React + Vite,
- routing,
- providers,
- layout aplikacji,
- ekran logowania,
- podstawowy dashboard,
- konfiguracja UI i stylów,
- PWA bootstrap.

Rezultat:
- aplikacja frontendowa startuje,
- jest gotowa do podłączenia feature’y.

## 8. Etap 6 — lokalna baza i offline storage
Zakres:
- konfiguracja IndexedDB,
- definicje lokalnych tabel,
- repozytoria lokalne,
- bootstrap danych po zalogowaniu,
- odczyt danych z lokalnej bazy w UI.

Rezultat:
- frontend nie zależy wyłącznie od online API,
- dane mogą istnieć lokalnie.

## 9. Etap 7 — feature’y MVP na frontendzie
Zakres:
- przełącznik workspace,
- lista kont,
- lista kategorii,
- lista transakcji,
- formularz dodania transakcji,
- podstawowy ekran budżetów,
- widok statusu synchronizacji.

Rezultat:
- użytkownik może wykonywać podstawowe akcje biznesowe w UI.

## 10. Etap 8 — synchronizacja
Zakres:
- outbox,
- lokalne operacje create/update/delete,
- endpoint `/sync/push`,
- endpoint `/sync/pull`,
- cursor,
- retry i obsługa błędów,
- aktualizacja lokalnej bazy po sync.

Rezultat:
- aplikacja działa offline i synchronizuje dane po odzyskaniu sieci.

## 11. Etap 9 — testy i stabilizacja
Zakres:
- testy jednostkowe kluczowych modułów,
- testy integracyjne backendu,
- testy krytycznych ścieżek synchronizacji,
- podstawowe testy UI/feature,
- poprawki błędów i porządki architektoniczne.

Rezultat:
- projekt jest stabilniejszy i przewidywalny.

## 12. Etap 10 — Docker i CI
Zakres:
- Dockerfile dla web i api,
- docker-compose,
- konfiguracja reverse proxy,
- GitHub Actions: lint, typecheck, test, build, docker build.

Rezultat:
- projekt daje się wdrożyć i automatycznie weryfikować.

## 13. Etap 11 — hardening MVP
Zakres:
- lepsza obsługa błędów,
- lepszy onboarding PWA,
- poprawa UX offline,
- komunikaty dot. konfliktów,
- backup strategy,
- cleanup dokumentacji.

Rezultat:
- MVP jest gotowe do realnego używania.

## 14. Priorytety implementacyjne
Kolejność jest ważna:
1. fundament repo,
2. backend i baza,
3. auth i workspace,
4. model finansowy,
5. frontend foundation,
6. local storage,
7. feature’y UI,
8. sync,
9. testy,
10. Docker i CI,
11. hardening.

Nie należy zaczynać od rozbudowanego UI bez gotowego modelu danych i syncu.

## 15. Kryterium ukończenia MVP
MVP jest gotowe, gdy:
- użytkownik loguje się,
- ma wiele workspace’ów,
- dodaje konta, kategorie i transakcje,
- widzi podstawowe budżety,
- aplikacja działa offline,
- dane synchronizują się po odzyskaniu połączenia,
- projekt działa przez Docker Compose,
- pipeline CI przechodzi poprawnie.

