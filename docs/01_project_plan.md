# Budget Tracker — Plan projektu

## 1. Cel produktu
Celem jest stworzenie jednej aplikacji do zarządzania wieloma niezależnymi budżetami finansowymi w modelu offline-first.

Obsługiwane przestrzenie budżetowe:
- domowy,
- JDG,
- spółka,
- wspólny budżet z żoną.

Aplikacja ma działać:
- jako klasyczna aplikacja webowa,
- jako PWA na iPhonie,
- offline z lokalnym zapisem danych,
- online z synchronizacją do centralnej bazy na serwerze.

Docelowe środowisko uruchomieniowe:
- Docker,
- hostowanie na Mac Mini M4,
- centralna baza danych na serwerze.

## 2. Założenia strategiczne
Projekt od początku powinien być budowany jako **offline-first**, a nie jako zwykły CRUD online z późniejszym „dopisaniem offline”.

To oznacza:
- lokalna baza danych na urządzeniu jest podstawą działania UI,
- użytkownik może dodawać i edytować dane bez internetu,
- synchronizacja odbywa się asynchronicznie,
- backend pełni rolę centralnego źródła prawdy,
- UI zawsze pokazuje stan lokalny i status synchronizacji.

## 3. Założenia domenowe
Jedna aplikacja obsługuje wiele niezależnych przestrzeni finansowych.

Każda przestrzeń (workspace) posiada własne:
- konta,
- kategorie,
- transakcje,
- budżety,
- członków,
- uprawnienia,
- raporty.

Przestrzenie są izolowane logicznie i uprawnieniowo.

## 4. Główne cele MVP
MVP powinno umożliwiać:
- logowanie użytkownika,
- posiadanie wielu workspace’ów,
- przełączanie aktywnego workspace’u,
- dodawanie kont,
- dodawanie kategorii,
- dodawanie transakcji przychodowych i kosztowych,
- transfery między kontami,
- definiowanie budżetów miesięcznych,
- podgląd historii transakcji,
- podstawowe raporty miesięczne,
- działanie offline,
- synchronizację po odzyskaniu połączenia,
- instalację jako PWA.

## 5. Zakres poza MVP
Poza MVP warto przewidzieć miejsce na:
- transakcje cykliczne,
- załączniki do transakcji,
- import CSV,
- eksport danych,
- wielowalutowość,
- bardziej rozbudowane raporty,
- reguły automatycznej kategoryzacji,
- integracje z bankami,
- powiadomienia,
- bardziej złożone role i audyt.

## 6. Role użytkowników
Minimalny zestaw ról:
- **owner** — pełna kontrola nad workspace,
- **editor** — może edytować dane finansowe,
- **viewer** — może tylko przeglądać.

To wystarcza na start dla:
- współdzielonego budżetu,
- JDG,
- spółki,
- przyszłego rozszerzenia o dodatkowe osoby.

## 7. Wymagania niefunkcjonalne
Aplikacja powinna być:
- responsywna,
- szybka w działaniu,
- czytelna na mobile,
- stabilna offline,
- bezpieczna,
- łatwa do rozwoju,
- łatwa do testowania,
- gotowa do wdrożenia przez Docker.

## 8. Ryzyka projektowe
Najważniejsze ryzyka:
- źle zaprojektowana synchronizacja doprowadzi do chaosu danych,
- zbyt późne wdrożenie offline-first zwiększy koszt zmian,
- iPhone PWA ma ograniczenia w tle i trzeba przyjąć realistyczny model synchronizacji,
- błędny model uprawnień może mieszać dane między workspace’ami,
- nadmiernie monolityczny backend utrudni rozwój.

## 9. Założenia domyślne
Na potrzeby projektu przyjmuję domyślnie:
- jeden użytkownik może należeć do wielu workspace’ów,
- workspace ma własne kategorie,
- walutą domyślną na start jest jedna waluta per workspace,
- synchronizacja działa przy starcie aplikacji, odzyskaniu połączenia i ręcznym wywołaniu,
- konflikty w MVP są rozwiązywane prostym mechanizmem wersjonowania i last-write-wins dla prostych przypadków,
- backend przechowuje historię zmian potrzebną do synchronizacji.

## 10. Kierunek wykonawczy
Najrozsądniejszy wariant realizacji:
- monorepo,
- frontend PWA w React + TypeScript,
- backend API w NestJS,
- PostgreSQL jako główna baza,
- lokalna baza w IndexedDB,
- własny moduł synchronizacji push/pull,
- Docker Compose do wdrożenia lokalnego i serwerowego.

## 11. Oczekiwany rezultat
Efektem ma być gotowa do dalszego rozwoju baza projektu, która:
- działa lokalnie i na serwerze,
- ma czytelną architekturę,
- wspiera offline-first,
- ma modularny kod,
- ma Dockerfile i GitHub Actions,
- pozwala agentowi implementacyjnemu wygenerować wysokiej jakości kod zgodny z planem.