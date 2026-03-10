# Budget Tracker — Strategia GitHub Actions

## 1. Cel
Pipeline CI/CD ma zapewniać, że projekt jest:
- budowalny,
- testowalny,
- spójny jakościowo,
- gotowy do budowy obrazów Docker,
- przygotowany do późniejszego deploymentu.

## 2. Minimalny zestaw workflow
Rekomendowany zestaw:
1. `ci.yml`
2. `docker.yml`
3. opcjonalnie `release.yml` lub `deploy.yml`

## 3. Workflow CI
### Cel
Sprawdza jakość kodu przy pushu i pull requestach.

### Kroki
- checkout repo,
- setup Node,
- setup pnpm,
- install dependencies,
- lint,
- typecheck,
- test,
- build.

### Zakres
Powinien obejmować:
- frontend,
- backend,
- pakiety współdzielone.

## 4. Workflow Docker
### Cel
Buduje obrazy Dockera dla aplikacji.

### Kroki
- checkout repo,
- setup buildx,
- logowanie do registry, jeśli potrzebne,
- build obrazu web,
- build obrazu api,
- opcjonalny push do registry.

### Rezultat
- gotowe obrazy do wdrożenia,
- możliwość użycia tego samego flow lokalnie i produkcyjnie.

## 5. Workflow release/deploy
Na start może być opcjonalny.

W przyszłości może:
- tagować wydania,
- publikować obrazy,
- uruchamiać deployment na Mac Mini,
- wykonywać restart compose.

## 6. Wyzwalacze
### CI
- `push` na główne branche,
- `pull_request`.

### Docker
- push na branch główny,
- tag release,
- ręczne wywołanie workflow dispatch.

## 7. Cache i wydajność
Warto użyć:
- cache dla pnpm,
- cache dla warstw Docker,
- ograniczenia równoległości przy konkurencyjnych uruchomieniach.

## 8. Sekrety
Sekrety w GitHub Actions powinny obejmować tylko to, co niezbędne, np.:
- dane do registry,
- sekrety deploy,
- opcjonalne klucze SSH.

Nie wolno trzymać sekretów w repo.

## 9. Quality gates
Pull request nie powinien być merge’owany, jeśli nie przejdzie:
- lint,
- typecheck,
- test,
- build.

To powinno być spięte z ochroną branchy.

## 10. Standard workflow `ci.yml`
Powinien zawierać zadania:
- `lint`
- `typecheck`
- `test`
- `build`

Można wykonać je jako osobne joby albo jako etapy jednego pipeline’u.

## 11. Standard workflow `docker.yml`
Powinien:
- budować obrazy z odpowiednich Dockerfile,
- tagować je przynajmniej `sha` i opcjonalnie `latest`,
- działać deterministycznie,
- móc być wykorzystany później do release.

## 12. Wersjonowanie obrazów
Rekomendacja:
- tag po commit SHA,
- opcjonalnie tag semver dla release,
- opcjonalnie `latest` tylko dla głównej gałęzi.

## 13. Dodatkowe dobre praktyki
- uruchamianie tylko potrzebnych jobów,
- unikanie zbyt dużych workflow,
- czytelne nazwy jobów,
- szybki feedback na PR,
- osobny workflow dla cięższych buildów Docker, jeśli zajdzie potrzeba.

## 14. Branching i PR workflow
Rekomendacja:
- `main` jako branch chroniony,
- praca przez feature branche,
- merge przez PR,
- obowiązkowe przejście CI,
- sensowny template PR w przyszłości.

## 15. Definicja done dla GitHub Actions
Warstwa CI/CD jest gotowa, gdy:
- każde otwarcie PR uruchamia walidację jakości,
- repo buduje się poprawnie,
- testy i typecheck są egzekwowane,
- obrazy Docker budują się automatycznie,
- pipeline jest spójny z monorepo i strukturą projektu.

