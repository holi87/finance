# Budget Tracker — Strategia testów i jakości

## 1. Cel
Strategia testów ma zapewnić, że projekt jest:
- stabilny,
- rozwijalny,
- przewidywalny,
- bezpieczny przy zmianach,
- odporny na regresje w obszarze offline i synchronizacji.

## 2. Zasada ogólna
Największy nacisk testowy powinien być położony na:
- logikę domenową,
- autoryzację per workspace,
- operacje transakcyjne,
- synchronizację,
- krytyczne ścieżki UI.

## 3. Warstwy testów

### Testy jednostkowe
Dla:
- serwisów backendowych,
- walidacji,
- helperów sync,
- mapperów,
- lokalnych repozytoriów klienta,
- logiki formularzy i use-case’ów.

### Testy integracyjne
Dla:
- endpointów backendu,
- autoryzacji,
- bazy danych,
- sync push/pull,
- spójności workspace isolation.

### Testy e2e
Dla:
- logowania,
- przełączania workspace,
- dodania transakcji,
- podstawowego offline flow,
- synchronizacji po odzyskaniu połączenia.

## 4. Priorytety testowe
Najpierw testuj to, co najłatwiej zepsuć i najdrożej naprawić:
1. autoryzacja,
2. workspace isolation,
3. transaction flows,
4. sync engine,
5. local storage,
6. podstawowe UI paths.

## 5. Backend — zakres testów
Minimalnie:
- auth service,
- workspace permissions,
- accounts service,
- categories service,
- transactions service,
- budgets service,
- sync service,
- health endpoint.

Szczególnie ważne przypadki:
- użytkownik bez dostępu do workspace nie widzi danych,
- viewer nie zapisuje danych,
- transfer tworzy poprawne wpisy,
- update zwiększa version,
- soft delete działa poprawnie,
- sync odrzuca nieprawidłowy baseVersion.

## 6. Frontend — zakres testów
Minimalnie:
- workspace switcher,
- transaction form,
- sync status,
- local storage adapters,
- podstawowe feature hooks,
- rendering empty/loading/error states.

## 7. Testy synchronizacji
To krytyczny obszar.

Należy testować:
- tworzenie outbox item po zapisie lokalnym,
- push poprawnych operacji,
- pull zmian po cursorze,
- retry po błędzie sieci,
- brak utraty operacji po restarcie,
- zachowanie przy konflikcie wersji,
- aktualizację local DB po sync.

## 8. Testy offline
Należy sprawdzić:
- możliwość odczytu lokalnych danych offline,
- możliwość dodania transakcji offline,
- widoczność statusu offline,
- późniejszą synchronizację po powrocie online.

## 9. Testy e2e — minimalne scenariusze
### Scenariusz 1
- login,
- wybór workspace,
- dodanie transakcji,
- sprawdzenie listy.

### Scenariusz 2
- przełączenie offline,
- dodanie transakcji,
- potwierdzenie lokalnego zapisu,
- powrót online,
- synchronizacja,
- potwierdzenie spójności danych.

### Scenariusz 3
- użytkownik viewer próbuje wykonać zapis,
- system odmawia.

## 10. Quality gates
Pipeline CI musi wymagać przynajmniej:
- lint,
- typecheck,
- testy jednostkowe,
- wybrane testy integracyjne,
- build.

## 11. Standard kodu
Kod powinien spełniać:
- pełne typowanie,
- czytelne nazwy,
- małe moduły,
- brak nadmiernego coupling,
- brak logiki biznesowej w kontrolerach,
- brak wielkich komponentów UI bez wydzielenia odpowiedzialności.

## 12. Review checklist
Przy review sprawdzaj:
- czy nie powstają wielkie klasy,
- czy nie ma przecieku danych między workspace’ami,
- czy offline-first nadal jest zachowane,
- czy sync nie został potraktowany skrótowo,
- czy testy pokrywają krytyczne ścieżki.

## 13. Definicja done dla warstwy jakości
Warstwa jakości jest gotowa, gdy:
- krytyczne ścieżki mają testy,
- CI blokuje regresje,
- architektura pozostaje modularna,
- sync i offline mają sensowne pokrycie testowe,
- projekt daje się rozwijać bez strachu przed losowym psuciem fundamentów.

