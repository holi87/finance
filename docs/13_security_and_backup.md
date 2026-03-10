# Budget Tracker — Bezpieczeństwo i backup

## 1. Cel
Projekt ma przechowywać dane finansowe, więc bezpieczeństwo nie może być dodatkiem.

Warstwa bezpieczeństwa musi obejmować:
- uwierzytelnianie,
- autoryzację,
- ochronę danych,
- bezpieczeństwo środowiska,
- backup i odtwarzanie,
- podstawowy audyt.

## 2. Uwierzytelnianie
Rekomendowany model:
- JWT access token,
- refresh token rotation,
- hasła haszowane przez Argon2,
- ograniczenie liczby prób logowania,
- możliwość unieważnienia sesji.

### Minimalne zasady
- brak przechowywania haseł jawnie,
- hashe z nowoczesnym algorytmem,
- refresh tokeny przechowywane i kontrolowane po stronie backendu,
- wygasanie access tokenów w krótkim czasie.

## 3. Autoryzacja
Autoryzacja musi działać na poziomie workspace.

Każda operacja biznesowa wymaga sprawdzenia:
- czy użytkownik jest zalogowany,
- czy należy do danego workspace,
- jaką ma rolę,
- czy ta rola pozwala wykonać akcję.

### Role
- owner,
- editor,
- viewer.

## 4. Ochrona danych w transporcie
W środowisku produkcyjnym wymagane:
- HTTPS,
- reverse proxy z TLS,
- brak przesyłania tokenów w niezabezpieczonym ruchu.

## 5. Ochrona danych w bazie
Minimalne wymagania:
- ograniczony dostęp do bazy tylko z prywatnej sieci,
- brak publicznego wystawiania postgres,
- regularne backupy,
- osobne dane konfiguracyjne i sekrety poza repo.

## 6. Sekrety
Sekrety nie mogą być przechowywane w repozytorium.

Dotyczy to co najmniej:
- `DATABASE_URL`,
- `JWT_ACCESS_SECRET`,
- `JWT_REFRESH_SECRET`,
- kluczy do registry,
- kluczy deploy.

## 7. Walidacja wejścia
Każdy endpoint zapisujący dane musi walidować:
- format danych,
- wymagane pola,
- typy,
- zakresy wartości,
- przynależność encji do workspace.

Nie wolno ufać payloadowi z klienta.

## 8. Ochrona przed typowymi błędami
Na start należy przewidzieć:
- rate limiting na auth,
- bezpieczne komunikaty błędów,
- brak wycieku stack trace do klienta,
- ochronę przed niepoprawnym dostępem między workspace’ami,
- sanity checks dla operacji synchronizacji.

## 9. Audyt
Przydatny minimalny audit log dla:
- logowania,
- utworzenia workspace,
- zmian członków i ról,
- operacji synchronizacji zakończonych błędem,
- krytycznych zmian danych.

## 10. Backup
Backup musi być traktowany jako wymaganie produkcyjne.

### Minimalna strategia
- regularny dump PostgreSQL,
- przechowywanie backupów poza głównym wolumenem danych,
- retencja kilku ostatnich kopii,
- okresowe testy restore.

### Rekomendacja praktyczna
- codzienny backup bazy,
- dodatkowy backup przed większą aktualizacją,
- prosta automatyzacja skryptem lub cronem.

## 11. Restore
Backup bez testu odtworzenia nie daje realnego bezpieczeństwa.

Należy przygotować procedurę:
1. zatrzymanie usług zapisujących,
2. przywrócenie bazy,
3. weryfikacja integralności,
4. ponowne uruchomienie usług,
5. kontrola działania aplikacji.

## 12. Bezpieczeństwo Dockera
- obrazy minimalne,
- użytkownik non-root tam, gdzie to możliwe,
- regularne aktualizacje obrazów bazowych,
- brak zbędnych portów,
- brak sekretów baked into image.

## 13. Bezpieczeństwo PWA i klienta
- nie trzymać wrażliwych sekretów w kodzie klienta,
- tokeny przechowywać ostrożnie zgodnie z wybranym modelem,
- wyraźnie rozdzielić dane lokalne per zalogowany użytkownik,
- przy wylogowaniu czyścić lokalne dane w kontrolowany sposób.

## 14. Incydenty i odzyskiwanie
Należy mieć prosty plan na:
- utratę pojedynczego urządzenia,
- uszkodzenie lokalnych danych klienta,
- awarię bazy,
- nieudaną migrację,
- błędny deploy.

## 15. Minimalna checklista bezpieczeństwa przed produkcją
- HTTPS działa poprawnie,
- sekrety nie są w repo,
- hasła są hashowane Argon2,
- refresh tokeny są rotowane,
- postgres nie jest publiczny,
- backup jest uruchomiony,
- restore został przetestowany,
- role workspace działają poprawnie,
- logi nie wyciekają danych wrażliwych.

## 16. Definicja done
Warstwa bezpieczeństwa i backupu jest gotowa, gdy:
- aplikacja ma bezpieczne uwierzytelnianie,
- uprawnienia są egzekwowane per workspace,
- dane transportowane są przez HTTPS,
- backup i restore są opisane i przetestowane,
- sekrety są zarządzane poza repo,
- podstawowe ryzyka operacyjne są obsłużone.

