# Budget Tracker — Deployment runbook

## 1. Cel
Runbook opisuje praktyczny proces wdrożenia aplikacji na serwer docelowy, którym jest Mac Mini M4 z Dockerem.

## 2. Założenia środowiskowe
Środowisko produkcyjne:
- Mac Mini M4,
- Docker Engine / Docker Desktop lub równoważne środowisko kontenerowe,
- Docker Compose,
- domena lub lokalny adres sieciowy,
- trwałe miejsce na backup bazy.

## 3. Usługi wdrażane
- `caddy`
- `web`
- `api`
- `postgres`

## 4. Wymagane pliki
Na serwerze powinny znaleźć się:
- `docker-compose.yml`
- pliki Dockerfile lub gotowe obrazy,
- `.env`
- konfiguracja reverse proxy,
- katalog backupów,
- dokument restore.

## 5. Przygotowanie hosta
- zainstaluj Docker,
- upewnij się, że compose działa,
- utwórz katalog projektu,
- przygotuj wolumen lub katalog danych postgres,
- skonfiguruj DNS lub dostęp sieciowy,
- upewnij się, że porty 80/443 są dostępne, jeśli używasz HTTPS.

## 6. Przygotowanie sekretów
Na serwerze ustaw:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- inne sekrety aplikacyjne

Sekrety nie mogą być commitowane do repo.

## 7. Pierwsze wdrożenie
Kolejność:
1. pobierz repo lub gotowe artefakty,
2. przygotuj `.env`,
3. uruchom `postgres`,
4. wykonaj migracje,
5. uruchom `api`,
6. uruchom `web`,
7. uruchom `caddy`,
8. sprawdź `/health`,
9. sprawdź logowanie i podstawowy flow aplikacji.

## 8. Aktualizacja aplikacji
Standardowy flow:
1. pobierz nowy kod lub nowe obrazy,
2. wykonaj backup bazy,
3. zatrzymaj usługi aplikacyjne, jeśli potrzebne,
4. uruchom migracje,
5. podnieś nowe kontenery,
6. sprawdź healthcheck,
7. zweryfikuj krytyczne ścieżki ręcznie.

## 9. Rollback
Jeśli wdrożenie się nie powiedzie:
1. zatrzymaj nowe kontenery,
2. wróć do poprzednich obrazów lub poprzedniego commita,
3. jeśli migracja była niekompatybilna, wykonaj restore bazy,
4. uruchom poprzednią stabilną wersję,
5. potwierdź działanie systemu.

## 10. Smoke test po deployu
Po każdym wdrożeniu sprawdź:
- otwarcie aplikacji,
- logowanie,
- listę workspace’ów,
- dodanie transakcji,
- odczyt transakcji,
- status synchronizacji,
- health endpoint.

## 11. Monitoring minimalny
Na start wystarczy:
- logi kontenerów,
- kontrola zużycia dysku,
- kontrola wolumenu postgres,
- prosty health endpoint,
- alert manualny lub prosty skrypt sprawdzający dostępność.

## 12. Backup operacyjny
Przed:
- deployem,
- większą migracją,
- zmianą konfiguracji,
- aktualizacją infrastruktury,
wykonaj backup bazy.

## 13. Rotacja logów i porządek operacyjny
- nie trzymaj nieskończonych logów bez rotacji,
- monitoruj miejsce na dysku,
- okresowo usuwaj nieużywane obrazy i build cache.

## 14. Incydenty
Na wypadek problemów przygotuj procedurę dla:
- awarii bazy,
- pełnego dysku,
- błędu po migracji,
- błędnego sekretu env,
- problemów z TLS,
- problemów z synchronizacją po deployu.

## 15. Definicja gotowości produkcyjnej
Środowisko deploymentowe jest gotowe, gdy:
- aplikacja startuje z compose,
- baza ma trwały storage,
- sekrety są poza repo,
- backup działa,
- rollback jest opisany,
- smoke test jest zdefiniowany,
- operator wie, jak wdrożyć i co sprawdzić po wdrożeniu.

