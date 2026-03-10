# Budget Tracker — Pełna checklista realizacji projektu

## 1. Cel
Ta checklista ma pozwolić doprowadzić projekt od fazy planowania do działającego, wdrożonego MVP.

## 2. Faza analizy i decyzji
- potwierdź zakres MVP,
- potwierdź role użytkowników,
- potwierdź model workspace,
- potwierdź jedną walutę per workspace,
- potwierdź brak integracji bankowych w MVP,
- potwierdź brak załączników w MVP,
- potwierdź strategię konfliktów MVP,
- potwierdź strategię synchronizacji push/pull.

## 3. Faza repo i architektury
- utwórz monorepo,
- skonfiguruj pnpm,
- skonfiguruj TypeScript,
- skonfiguruj ESLint/Prettier,
- przygotuj strukturę apps/packages/docs/infra,
- dodaj dokumentację architektury,
- dodaj dokumentację domeny,
- dodaj kontrakt API,
- dodaj plan wdrożenia.

## 4. Faza backendu
- uruchom NestJS,
- skonfiguruj env,
- skonfiguruj Prisma,
- skonfiguruj PostgreSQL,
- dodaj health endpoint,
- dodaj auth,
- dodaj workspaces i memberships,
- dodaj accounts,
- dodaj categories,
- dodaj transactions,
- dodaj budgets,
- dodaj sync endpoints,
- dodaj audit log minimum.

## 5. Faza frontendu
- uruchom React + Vite,
- skonfiguruj routing,
- skonfiguruj UI foundation,
- dodaj login,
- dodaj dashboard,
- dodaj workspace switcher,
- dodaj accounts UI,
- dodaj categories UI,
- dodaj transactions UI,
- dodaj budgets UI,
- dodaj settings,
- dodaj sync status.

## 6. Faza offline-first
- dodaj IndexedDB,
- dodaj lokalne repozytoria,
- dodaj outbox,
- dodaj sync metadata,
- dodaj push,
- dodaj pull,
- dodaj retry,
- dodaj conflict handling MVP,
- dodaj komunikaty offline w UI.

## 7. Faza jakości
- dodaj testy jednostkowe backendu,
- dodaj testy integracyjne backendu,
- dodaj testy lokalnego storage,
- dodaj testy sync engine,
- dodaj testy podstawowych flow UI,
- dodaj smoke scenariusze e2e.

## 8. Faza infrastruktury
- przygotuj Dockerfile dla web,
- przygotuj Dockerfile dla api,
- przygotuj docker-compose,
- skonfiguruj postgres volume,
- skonfiguruj reverse proxy,
- przygotuj `.env.example`,
- przygotuj backup script lub runbook.

## 9. Faza CI/CD
- skonfiguruj GitHub Actions CI,
- dodaj lint,
- dodaj typecheck,
- dodaj test,
- dodaj build,
- dodaj docker build,
- skonfiguruj branch protection.

## 10. Faza wdrożenia
- przygotuj host Mac Mini,
- skonfiguruj sekrety,
- uruchom bazę,
- wykonaj migracje,
- uruchom backend,
- uruchom frontend,
- uruchom reverse proxy,
- sprawdź health,
- wykonaj smoke test.

## 11. Faza produkcyjnego domknięcia
- sprawdź HTTPS,
- sprawdź backup,
- sprawdź restore procedure,
- sprawdź role i autoryzację,
- sprawdź offline flow,
- sprawdź sync po odzyskaniu sieci,
- sprawdź logowanie i refresh token flow,
- sprawdź workspace isolation,
- sprawdź podstawowe raporty.

## 12. Kryterium pełnej gotowości projektu
Projekt jest gotowy do realnego użycia, gdy:
- działa na web i iPhonie jako PWA,
- wspiera offline-first,
- synchronizuje dane poprawnie,
- ma modularną architekturę,
- daje się uruchomić przez Docker,
- jest opisany w dokumentacji,
- ma podstawowe testy i CI,
- ma backup i runbook wdrożeniowy,
- jest gotowy do dalszych iteracji bez przebudowy fundamentów.

