# Budget Tracker — Struktura repozytorium i modułów

## 1. Podejście do repozytorium
Rekomendowane jest **monorepo** zarządzane przez `pnpm workspaces`.

Powody:
- wspólne typy i walidacje,
- łatwiejsza spójność wersji zależności,
- prostsze współdzielenie kodu,
- wygodniejsza obsługa CI,
- dobre dopasowanie do frontendu, backendu i pakietów współdzielonych.

## 2. Proponowana struktura główna

```text
budget-tracker/
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
    scripts/
  docs/
  .github/
    workflows/
```

## 3. Opis katalogów głównych

### `apps/web`
Frontend PWA.

### `apps/api`
Backend REST API oraz logika synchronizacji.

### `packages/ui`
Wspólne komponenty UI, helpery prezentacyjne, design tokens.

### `packages/shared-types`
Typy domenowe i kontrakty współdzielone między frontendem i backendem.

### `packages/shared-validation`
Schematy walidacyjne, np. Zod, dla DTO i obiektów domenowych.

### `packages/sync-engine`
Wspólna logika operacji synchronizacyjnych, modele outboxa, helpery do wersjonowania.

### `packages/config`
Wspólna konfiguracja TypeScript, ESLint, Prettier, testów i ewentualnie shared env helpers.

### `infra/docker`
Dockerfile, pliki compose, konfiguracja reverse proxy.

### `infra/scripts`
Skrypty pomocnicze do uruchamiania, migracji, seedów i backupów.

### `docs`
Dokumentacja architektury, domeny, synchronizacji, środowisk i decyzji ADR.

### `.github/workflows`
Workflow CI/CD.

## 4. Struktura aplikacji frontendowej

```text
apps/web/
  public/
  src/
    app/
    features/
      auth/
      workspaces/
      dashboard/
      accounts/
      categories/
      transactions/
      budgets/
      reports/
      settings/
    components/
    layouts/
    lib/
    services/
    storage/
    sync/
    hooks/
    styles/
    types/
  tests/
```

## 5. Zasady organizacji frontendu

### `src/app`
Konfiguracja aplikacji:
- entrypoint,
- router,
- providers,
- global state bootstrap,
- error boundaries.

### `src/features`
Kod per domena biznesowa.

Każdy feature powinien zawierać tylko własną odpowiedzialność, np.:
- komponenty feature,
- hooki,
- akcje,
- use-case’y,
- adaptery do storage/API,
- lokalne typy.

### `src/components`
Tylko komponenty współdzielone, niepowiązane z jedną domeną.

### `src/storage`
Obsługa IndexedDB, repozytoria lokalne, mapowanie rekordów.

### `src/sync`
Mechanizmy synchronizacji, outbox, retry, network awareness, cursor handling.

### `src/services`
Warstwa komunikacji z API i usługi przekrojowe.

## 6. Struktura backendu

```text
apps/api/
  src/
    main.ts
    app.module.ts
    modules/
      auth/
      users/
      workspaces/
      memberships/
      accounts/
      categories/
      transactions/
      budgets/
      reports/
      sync/
      audit/
      health/
    common/
    config/
    database/
  prisma/
  test/
```

## 7. Zasady organizacji backendu

### `src/modules/*`
Każdy moduł domenowy ma własny katalog i własną odpowiedzialność.

Preferowany układ modułu:

```text
transactions/
  controllers/
  services/
  dto/
  domain/
  mappers/
  repositories/
  policies/
  validators/
  transactions.module.ts
```

Nie należy tworzyć jednego wielkiego serwisu obejmującego całą logikę finansową.

### `src/common`
Kod przekrojowy:
- guards,
- interceptors,
- exceptions,
- shared utilities,
- base abstractions.

### `src/config`
Konfiguracja aplikacji, env parsing, feature flags, bootstrap config.

### `src/database`
Adaptery bazy, repozytoria wspólne, helpery i integracja z ORM.

### `prisma`
Schema, migracje, seedy.

## 8. Struktura pakietów współdzielonych

### `packages/shared-types`
Przykładowa zawartość:
- identyfikatory encji,
- enumy,
- DTO contract types,
- typy sync operation,
- typy statusów synchronizacji.

### `packages/shared-validation`
Przykładowa zawartość:
- schema logowania,
- schema workspace,
- schema transaction,
- schema budgets,
- schema sync payload.

### `packages/sync-engine`
Przykładowa zawartość:
- definicje operacji sync,
- outbox item model,
- merge helpers,
- cursor models,
- conflict flags.

## 9. Dokumentacja w repo
W `docs/` powinny znaleźć się co najmniej:
- plan projektu,
- architektura,
- model domenowy,
- protokół synchronizacji,
- schemat bazy,
- strategia Docker,
- strategia CI/CD,
- roadmapa MVP,
- ADR-y przy ważnych decyzjach.

## 10. Konwencje organizacyjne

### Nazewnictwo
- czytelne nazwy domenowe,
- unikanie skrótów bez potrzeby,
- spójne nazwy plików i katalogów,
- identyczne pojęcia na frontendzie i backendzie.

### Importy
- ograniczenie głębokich zależności między modułami,
- preferowanie public API pakietów,
- brak losowego importowania wnętrza innych modułów.

### Granice odpowiedzialności
- UI nie powinno znać szczegółów bazy lokalnej,
- sync engine nie powinien mieszać się z komponentami prezentacyjnymi,
- backendowe kontrolery nie powinny zawierać logiki biznesowej,
- moduły domenowe nie powinny zależeć bezpośrednio od warstwy HTTP.

## 11. Testy w strukturze repo
- testy jednostkowe blisko kodu,
- testy integracyjne backendu w `apps/api/test`,
- testy frontendu per feature,
- testy e2e w dedykowanym katalogu, gdy projekt dojrzeje.

## 12. Efekt docelowy
Repozytorium ma być:
- modularne,
- czytelne,
- przewidywalne,
- łatwe do rozwijania,
- gotowe pod pracę człowieka i agenta kodującego,
- spójne z CI, Dockerem i dokumentacją.