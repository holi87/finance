# Budget Tracker — Specyfikacja UI/UX

## 1. Cel UI/UX
Interfejs ma być:
- szybki,
- prosty,
- czytelny,
- wygodny na telefonie,
- wygodny na desktopie,
- zrozumiały w warunkach offline,
- spójny dla wielu workspace’ów.

Projekt nie powinien przypominać ciężkiego systemu księgowego. Ma być praktyczny do codziennego użycia.

## 2. Zasady UX
Najważniejsze zasady:
- najczęstsze akcje mają być osiągalne w 1–2 krokach,
- dodanie transakcji ma być bardzo szybkie,
- użytkownik zawsze wie, w którym workspace pracuje,
- użytkownik zawsze widzi status synchronizacji,
- aplikacja ma działać dobrze jedną ręką na iPhonie,
- formularze mają być krótkie i czytelne,
- krytyczne akcje mają mieć potwierdzenia tylko tam, gdzie naprawdę trzeba.

## 3. Główne widoki MVP

### 1. Login
Elementy:
- email,
- hasło,
- przycisk logowania,
- informacja o błędach,
- stan ładowania.

### 2. Dashboard
Elementy:
- aktywny workspace,
- saldo całkowite,
- przychody w bieżącym okresie,
- wydatki w bieżącym okresie,
- wykorzystanie budżetów,
- ostatnie transakcje,
- status synchronizacji.

### 3. Lista transakcji
Elementy:
- filtry,
- lista pozycji,
- szybkie dodawanie,
- przejście do szczegółów lub edycji.

### 4. Formularz dodania transakcji
Elementy:
- typ transakcji,
- konto,
- kategoria,
- kwota,
- data,
- opis,
- notatka,
- zapis.

### 5. Konta
Elementy:
- lista kont,
- saldo per konto,
- możliwość dodania/edycji konta.

### 6. Kategorie
Elementy:
- lista kategorii,
- podział na kosztowe/przychodowe,
- możliwość dodania/edycji.

### 7. Budżety
Elementy:
- okres,
- limity kategorii,
- wykorzystanie,
- wskaźniki przekroczeń.

### 8. Ustawienia
Elementy:
- profil,
- workspace management,
- członkowie,
- preferencje,
- ręczna synchronizacja,
- informacje o urządzeniu.

## 4. Nawigacja
### Mobile
Rekomendowana dolna nawigacja:
- Dashboard,
- Transakcje,
- Dodaj,
- Budżety,
- Ustawienia.

### Desktop
Rekomendowany sidebar lub top navigation z lepszym dostępem do:
- workspace switcher,
- dashboard,
- transactions,
- accounts,
- categories,
- budgets,
- reports,
- settings.

## 5. Workspace switcher
Workspace switcher musi być bardzo widoczny.

Powinien:
- pokazywać nazwę aktywnego workspace,
- pozwalać szybko przełączać kontekst,
- wyraźnie separować dane między workspace’ami,
- być dostępny z każdego głównego widoku.

## 6. Status synchronizacji
To jest kluczowy element UX.

Użytkownik powinien widzieć:
- online / offline,
- „zmiany zapisane lokalnie”,
- „trwa synchronizacja”,
- „ostatnia synchronizacja: ...”,
- „błąd synchronizacji”,
- licznik niewysłanych zmian.

Status nie może być ukryty głęboko w ustawieniach.

## 7. Zachowanie offline
W trybie offline użytkownik powinien:
- nadal móc przeglądać lokalne dane,
- nadal móc dodawać i edytować dane,
- widzieć, że pracuje offline,
- wiedzieć, że zmiany czekają na synchronizację.

Aplikacja nie powinna blokować formularzy tylko dlatego, że nie ma internetu.

## 8. Formularz transakcji — UX
To najważniejszy formularz.

Musi być:
- krótki,
- szybki,
- wygodny mobilnie,
- z sensownymi wartościami domyślnymi,
- z walidacją inline.

Rekomendowane pola w kolejności:
1. typ,
2. kwota,
3. konto,
4. kategoria,
5. data,
6. opis,
7. notatka.

Można dodać opcję „zapisz i dodaj kolejną”.

## 9. Dashboard — UX
Dashboard ma odpowiadać na pytania:
- ile mam pieniędzy,
- ile wydałem,
- ile zarobiłem,
- czy przekraczam budżety,
- co wydarzyło się ostatnio.

Nie powinien być przeładowany wykresami.

MVP dashboard powinien stawiać na:
- czytelne liczby,
- kilka kart podsumowujących,
- ostatnie transakcje,
- proste wskaźniki budżetowe.

## 10. Budżety — UX
Dla każdej kategorii warto pokazać:
- limit,
- wydane,
- pozostało,
- procent wykorzystania.

Kolory ostrzegawcze dopiero przy zbliżaniu się do limitu lub po jego przekroczeniu.

## 11. Responsywność
Projekt powinien być mobile-first.

Breakpoints powinny wspierać:
- iPhone viewport,
- małe tablety,
- desktop.

Najważniejsze zasady:
- duże klikalne obszary,
- czytelna typografia,
- brak przeładowania ekranu tabelami na mobile,
- karty zamiast szerokich tabel tam, gdzie to lepsze.

## 12. Dostępność
Minimalne wymagania:
- odpowiedni kontrast,
- obsługa klawiatury na desktopie,
- poprawne etykiety pól,
- focus states,
- semantyczne komponenty,
- brak komunikacji wyłącznie kolorem.

## 13. PWA na iPhonie
UI powinno uwzględniać:
- safe areas,
- poprawne spacingi przy dolnym pasku,
- onboarding „Dodaj do ekranu początkowego”,
- stabilne zachowanie po wznowieniu aplikacji,
- brak polegania na tle dla sync.

## 14. Komponenty bazowe
Na start potrzebne:
- Button,
- Input,
- Select,
- DatePicker,
- Modal,
- Sheet/Drawer,
- Tabs,
- Card,
- EmptyState,
- ErrorState,
- SyncBadge,
- CurrencyAmount,
- WorkspaceSwitcher.

## 15. Stany systemowe
Każdy główny widok powinien mieć:
- loading state,
- empty state,
- error state,
- offline state.

## 16. Kierunek wizualny
Styl powinien być:
- nowoczesny,
- lekki,
- spokojny,
- profesjonalny,
- czytelny finansowo,
- bez przesady w animacjach.

## 17. Definicja done dla UI/UX
Warstwa UI/UX jest gotowa, gdy:
- główne ścieżki użytkownika są szybkie,
- aplikacja dobrze działa na iPhonie i desktopie,
- status synchronizacji jest zrozumiały,
- formularz transakcji jest wygodny,
- workspace switcher jasno separuje konteksty,
- interfejs pozostaje prosty mimo wielu obszarów funkcjonalnych.

