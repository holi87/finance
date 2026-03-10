# Budget Tracker — Protokół synchronizacji offline-first

## 1. Cel synchronizacji
Synchronizacja ma umożliwiać:
- pełną pracę offline,
- lokalny zapis zmian bez oczekiwania na serwer,
- późniejsze przesłanie zmian do backendu,
- pobranie zmian wykonanych na innych urządzeniach,
- zachowanie spójności danych w ramach workspace.

## 2. Założenia podstawowe
Model synchronizacji:
- klient jest local-first,
- backend jest source of truth,
- klient utrzymuje lokalną bazę danych,
- klient utrzymuje outbox niewysłanych operacji,
- backend utrzymuje historię zmian lub log zmian,
- synchronizacja działa przez mechanizm push/pull.

## 3. Główne pojęcia

### Local State
Stan danych w lokalnej bazie klienta.

### Outbox
Kolejka lokalnych operacji oczekujących na wysłanie.

### Push
Wysłanie lokalnych zmian z klienta do backendu.

### Pull
Pobranie zmian z backendu od ostatniego znanego kursora.

### Cursor
Znacznik określający, do którego miejsca klient pobrał zdalne zmiany.

### Version
Wersja encji wykorzystywana do wykrywania konfliktów.

## 4. Cykl życia zmiany lokalnej
1. Użytkownik tworzy lub edytuje rekord.
2. Zmiana zapisywana jest w lokalnej bazie.
3. Tworzona jest operacja w outboxie.
4. UI natychmiast pokazuje nowy stan.
5. Gdy jest sieć, klient wysyła operacje do backendu.
6. Backend waliduje i zatwierdza operacje.
7. Outbox oznacza operacje jako zsynchronizowane.
8. Klient wykonuje pull zmian z backendu.

## 5. Typy operacji synchronizacji
Na start wystarczą:
- create,
- update,
- delete.

Każda operacja powinna odnosić się do konkretnej encji, np.:
- workspace,
- account,
- category,
- transaction,
- budgetLimit.

## 6. Model operacji outbox
Każdy rekord outbox może mieć strukturę:

```json
{
  "id": "local-operation-id",
  "deviceId": "device-id",
  "workspaceId": "workspace-id",
  "entityType": "transaction",
  "entityId": "entity-id",
  "operationType": "create",
  "baseVersion": 0,
  "payload": {},
  "createdAt": "timestamp",
  "retryCount": 0,
  "status": "pending"
}
```

## 7. Endpoint push
### `POST /sync/push`
Klient wysyła paczkę lokalnych operacji.

Przykładowa struktura request:

```json
{
  "deviceId": "device-id",
  "workspaceId": "workspace-id",
  "operations": [
    {
      "operationId": "op-1",
      "entityType": "transaction",
      "entityId": "txn-1",
      "operationType": "create",
      "baseVersion": 0,
      "payload": {
        "accountId": "acc-1",
        "categoryId": "cat-1",
        "type": "expense",
        "amount": "120.00",
        "currency": "PLN",
        "description": "Zakupy",
        "transactionDate": "2026-03-10"
      }
    }
  ]
}
```

### Odpowiedź push
Backend powinien zwrócić:
- status każdej operacji,
- nową wersję encji,
- informację o błędzie lub konflikcie,
- nowy znacznik zmian, jeśli potrzebny.

Przykładowa odpowiedź:

```json
{
  "accepted": [
    {
      "operationId": "op-1",
      "entityType": "transaction",
      "entityId": "txn-1",
      "newVersion": 1,
      "status": "applied"
    }
  ],
  "rejected": []
}
```

## 8. Endpoint pull
### `GET /sync/pull`
Klient pobiera zmiany od ostatniego kursora.

Przykładowe parametry:
- `workspaceId`
- `cursor`
- opcjonalnie `limit`

Przykład:
`GET /sync/pull?workspaceId=ws-1&cursor=change-120`

### Odpowiedź pull
Backend zwraca:
- listę zmian,
- nowy cursor,
- informację, czy są kolejne strony.

Przykładowa odpowiedź:

```json
{
  "changes": [
    {
      "changeId": "change-121",
      "entityType": "transaction",
      "entityId": "txn-2",
      "operationType": "update",
      "version": 3,
      "changedAt": "2026-03-10T12:00:00Z",
      "payload": {}
    }
  ],
  "nextCursor": "change-121",
  "hasMore": false
}
```

## 9. Zasady backendu dla push
Backend przy push powinien:
- uwierzytelnić użytkownika,
- sprawdzić dostęp do workspace,
- zwalidować payload,
- sprawdzić baseVersion,
- zastosować zmianę transakcyjnie,
- zwiększyć version rekordu,
- zapisać wpis do logu zmian sync,
- zwrócić wynik per operacja.

## 10. Zasady backendu dla pull
Backend przy pull powinien:
- uwierzytelnić użytkownika,
- sprawdzić dostęp do workspace,
- zwrócić tylko zmiany z danego workspace,
- zwrócić zmiany po wskazanym cursorze,
- wspierać paginację,
- zwrócić deterministic ordering zmian.

## 11. Strategia konfliktów
W MVP rekomendowany model:
- klient wysyła `baseVersion`,
- jeśli backend widzi, że rekord ma inną wersję niż oczekiwana, oznacza konflikt,
- dla prostych przypadków może stosować last-write-wins,
- dla bardziej ryzykownych przypadków zwraca konflikt do jawnej obsługi przez klienta.

### Przykład konfliktu
- urządzenie A edytuje transakcję przy wersji 2,
- urządzenie B wcześniej już zapisało wersję 3,
- urządzenie A wysyła update z `baseVersion = 2`,
- backend odrzuca lub oznacza konflikt.

## 12. Soft delete
Usuwanie encji finansowych powinno być realizowane jako soft delete.

Powód:
- klient musi móc pobrać informację, że rekord został usunięty,
- synchronizacja wymaga widoczności usunięć.

## 13. Idempotencja
Push powinien być możliwie idempotentny.

Zalecenie:
- każda operacja ma unikalne `operationId`,
- backend potrafi rozpoznać ponowną wysyłkę tej samej operacji.

## 14. Retry i odporność
Klient powinien:
- zachować outbox po restarcie aplikacji,
- ponawiać synchronizację po odzyskaniu sieci,
- zwiększać `retryCount`,
- pokazywać użytkownikowi stan błędów,
- nie usuwać operacji z outbox, dopóki backend nie potwierdzi sukcesu.

## 15. Kolejność działań synchronizacji
Rekomendowana sekwencja:
1. jeśli trwa sync, nie uruchamiaj drugiego równolegle,
2. wykonaj push lokalnych operacji,
3. po sukcesie wykonaj pull,
4. zaktualizuj lokalny cursor,
5. odśwież lokalne widoki i status sync.

## 16. Wymagane pola techniczne encji
Każda encja synchronizowana powinna mieć:
- id,
- workspaceId,
- createdAt,
- updatedAt,
- version,
- deletedAt lub delete marker.

## 17. Statusy widoczne w UI
Użytkownik powinien widzieć:
- offline,
- online,
- synchronizacja w toku,
- ostatnia synchronizacja,
- liczba niewysłanych zmian,
- błąd synchronizacji.

## 18. Wniosek
Protokół synchronizacji powinien być prosty, przewidywalny i trwały.

Najważniejsze elementy:
- lokalny outbox,
- push/pull,
- cursor,
- versioning,
- soft delete,
- idempotencja,
- jawny status synchronizacji w UI.

