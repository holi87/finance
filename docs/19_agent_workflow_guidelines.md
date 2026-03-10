# Agent Workflow Guidelines

Ten plik jest przeznaczony dla agenta pracującego nad projektem. Zawiera krótkie zasady pracy, aby utrzymać spójność repozytorium i dokumentacji.

## 1. Gdzie szukać kontekstu projektu
Jeśli kontekst rozmowy zostanie skrócony lub utracony, wszystkie kluczowe informacje znajdują się w katalogu `docs/`.

Najważniejsze dokumenty:

- `project-plan.md`
- `architecture.md`
- `domain-model.md`
- `sync-protocol.md`
- `database-schema.md`
- `api-contract.md`
- `ui-ux-spec.md`
- `docker-setup.md`
- `github-actions.md`
- `deployment-runbook.md`
- `testing-strategy.md`
- `project-execution-checklist.md`

Zawsze traktuj dokumentację w `docs/` jako źródło prawdy dla architektury projektu.

## 2. Zasady pracy nad kodem
Podczas implementacji:

- trzymaj się struktury repozytorium
- nie zmieniaj architektury bez aktualizacji dokumentacji
- implementuj funkcjonalności etapami
- utrzymuj repo w stanie kompilowalnym

Po każdej większej zmianie upewnij się, że:

- projekt się buduje
- lint przechodzi
- typecheck przechodzi

## 3. Commity
Po każdej większej zmianie wykonaj commit.

Przykłady większych zmian:

- nowy moduł
- nowy endpoint
- zmiana schematu bazy
- dodanie funkcjonalności UI
- zmiany w synchronizacji
- zmiany w architekturze

Unikaj bardzo dużych commitów obejmujących wiele niezależnych zmian.

## 4. Push do repozytorium
Po serii logicznych commitów wykonaj push do zdalnego repozytorium.

Dzięki temu historia projektu pozostaje czytelna i łatwo wrócić do wcześniejszego stanu.

## 5. Aktualizacja changeloga
Przed każdym commitem:

1. Otwórz `README.md`.
2. W sekcji **Changelog** dodaj krótką informację o zmianie.
3. Opisz w 1–2 linijkach co zostało dodane lub zmienione.

Przykład:

```
### 2026-03-10
- dodano moduł accounts
- dodano endpoint tworzenia transakcji
- przygotowano strukturę sync engine
```

Changelog powinien rosnąć chronologicznie.

## 6. Zasada spójności
Przed zakończeniem pracy nad zadaniem sprawdź:

- czy kod odpowiada dokumentacji
- czy dokumentacja nadal jest aktualna
- czy README zawiera changelog
- czy repo jest w stanie uruchomić projekt

## 7. Najważniejsza zasada
Repozytorium zawsze powinno pozostać:

- kompilowalne
- czytelne
- zgodne z dokumentacją

Nie zostawiaj repo w stanie częściowo zepsutym lub niespójnym.

