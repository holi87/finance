# Budget Tracker — Strategia Docker i uruchomienia

## 1. Cel
Projekt ma być uruchamialny w sposób spójny:
- lokalnie podczas developmentu,
- na serwerze docelowym na Mac Mini M4,
- w CI podczas budowy obrazów.

Docker ma być pełnoprawnym artefaktem dostarczania aplikacji.

## 2. Kontenery docelowe
Minimalny zestaw usług:
- `web` — frontend PWA serwowany jako aplikacja webowa,
- `api` — backend NestJS,
- `postgres` — baza danych,
- `caddy` — reverse proxy i TLS.

Opcjonalnie w przyszłości:
- job do backupów,
- obserwowalność,
- pgadmin lub admin panel tylko dewelopersko.

## 3. Architektura sieciowa
- `caddy` wystawia ruch na zewnątrz,
- `web` i `api` są widoczne dla proxy w prywatnej sieci dockera,
- `api` łączy się z `postgres` po wewnętrznej sieci,
- `postgres` nie musi być publicznie wystawiany.

## 4. Rekomendowane obrazy
### Web
- build multi-stage,
- etap budowania na Node,
- etap runtime na lekkim serwerze statycznym, np. nginx lub caddy.

### API
- build multi-stage,
- runtime w lekkim obrazie Node,
- uruchamianie jako non-root,
- tylko produkcyjne zależności w finalnym obrazie.

### Postgres
- oficjalny obraz PostgreSQL w stabilnej wersji LTS.

## 5. Proponowany układ plików
```text
infra/docker/
  web.Dockerfile
  api.Dockerfile
  caddy/Caddyfile
  compose/
    docker-compose.yml
    docker-compose.dev.yml
```

## 6. Dockerfile dla frontendu
Frontend powinien:
- zbudować statyczne pliki aplikacji,
- serwować je przez lekki runtime,
- mieć poprawne nagłówki dla assetów statycznych,
- wspierać PWA assets i manifest.

### Zalecenia
- oddzielny etap install/build/runtime,
- cache dependencies możliwie efektywnie,
- kopiować tylko to, co niezbędne,
- finalny obraz minimalny.

## 7. Dockerfile dla backendu
Backend powinien:
- zbudować aplikację NestJS,
- uruchamiać skompilowany kod,
- mieć healthcheck,
- korzystać z env,
- startować w trybie produkcyjnym.

### Zalecenia
- multi-stage build,
- osobny etap dla dependencies i build,
- finalny runtime bez narzędzi dev,
- użytkownik nie-root,
- sensowna obsługa SIGTERM.

## 8. Docker Compose
Compose powinien zapewniać łatwy start całego systemu.

### Minimalne usługi
- web,
- api,
- postgres,
- caddy.

### Compose powinien zawierać
- sieci,
- wolumen dla postgres,
- healthcheck,
- zależności usług,
- plik env,
- port mapping tylko tam, gdzie potrzebny.

## 9. Środowiska
### Development
Cele:
- szybki start,
- wygodna praca lokalna,
- możliwość hot reload poza dockerem albo w dockerze.

Możliwe warianty:
- frontend i backend uruchamiane lokalnie, postgres w dockerze,
- albo całość w compose.

### Production
Cele:
- prosty i stabilny deployment,
- trwałość danych,
- mała liczba ruchomych części,
- łatwe backupy.

## 10. Konfiguracja środowiskowa
Należy przygotować:
- `.env.example`,
- osobne zmienne dla web i api,
- bezpieczne przechowywanie sekretów poza repo.

Przykładowe zmienne:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_BASE_URL`
- `API_BASE_URL`
- `NODE_ENV`

## 11. Persistencja danych
PostgreSQL musi używać trwałego wolumenu.

Rekomendacje:
- dedykowany volume dockera albo katalog bind mount,
- regularne backupy dumpów,
- plan odtwarzania danych.

## 12. Reverse proxy
Caddy jest dobrym wyborem, bo upraszcza:
- HTTPS,
- routing,
- certyfikaty,
- prostą konfigurację.

Przykładowe role Caddy:
- serwowanie frontendu,
- proxy `/api/*` do backendu,
- terminacja TLS,
- nagłówki bezpieczeństwa.

## 13. Bezpieczeństwo kontenerów
- uruchamianie jako non-root, jeśli możliwe,
- ograniczenie publicznie wystawionych portów,
- brak sekretów w obrazie,
- minimalne obrazy runtime,
- aktualne wersje bazowych obrazów.

## 14. Healthcheck i restart policy
Każda usługa powinna mieć sensowną politykę restartu.

Rekomendacje:
- `api` — healthcheck na `/health`,
- `postgres` — wbudowane sprawdzenie gotowości,
- `web` — prosty healthcheck HTTP,
- restart policy odpowiednia dla środowiska produkcyjnego.

## 15. Mac Mini M4 jako host
To środowisko jest wystarczające dla tego projektu.

Warto przewidzieć:
- stały backup bazy,
- monitoring zajętości dysku,
- aktualizację obrazów przez compose pull/up,
- możliwość prostego rollbacku.

## 16. Definicja done dla warstwy Docker
Za gotową uznajemy warstwę Docker, gdy:
- cały system startuje jednym poleceniem compose,
- frontend działa przez reverse proxy,
- backend działa i łączy się z bazą,
- baza ma trwały wolumen,
- env jest udokumentowany,
- obrazy są lekkie i przewidywalne,
- projekt daje się uruchomić lokalnie i na serwerze z minimalnymi zmianami.

