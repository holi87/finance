# Budget Tracker — Kontrakt API

## 1. Założenia ogólne
API jest wersjonowane i oparte o REST.

Proponowany prefix:
- `/api/v1`

Wszystkie endpointy biznesowe poza logowaniem wymagają uwierzytelnienia.

Format odpowiedzi:
- JSON,
- spójne kody HTTP,
- spójny format błędów,
- jawna walidacja payloadów.

## 2. Standard odpowiedzi błędów
Przykładowy format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  }
}
```

## 3. Auth

### `POST /api/v1/auth/login`
Cel:
- logowanie użytkownika.

Request:
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "User"
  }
}
```

### `POST /api/v1/auth/refresh`
Cel:
- odświeżenie sesji.

Request:
```json
{
  "refreshToken": "..."
}
```

Response:
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### `POST /api/v1/auth/logout`
Cel:
- unieważnienie refresh tokenu.

## 4. Users

### `GET /api/v1/users/me`
Zwraca aktualnego użytkownika.

Response:
```json
{
  "id": "...",
  "email": "user@example.com",
  "displayName": "User"
}
```

## 5. Workspaces

### `GET /api/v1/workspaces`
Lista workspace’ów użytkownika.

Response:
```json
[
  {
    "id": "ws-1",
    "name": "Domowy",
    "type": "personal",
    "baseCurrency": "PLN",
    "role": "owner"
  }
]
```

### `POST /api/v1/workspaces`
Tworzy workspace.

Request:
```json
{
  "name": "Domowy",
  "type": "personal",
  "baseCurrency": "PLN"
}
```

### `GET /api/v1/workspaces/:workspaceId`
Zwraca szczegóły workspace.

### `PATCH /api/v1/workspaces/:workspaceId`
Aktualizacja workspace.

### `GET /api/v1/workspaces/:workspaceId/members`
Lista członków workspace.

### `POST /api/v1/workspaces/:workspaceId/members`
Dodanie członka do workspace.

Request:
```json
{
  "userId": "user-2",
  "role": "editor"
}
```

### `PATCH /api/v1/workspaces/:workspaceId/members/:membershipId`
Zmiana roli.

## 6. Accounts

### `GET /api/v1/workspaces/:workspaceId/accounts`
Lista kont.

### `POST /api/v1/workspaces/:workspaceId/accounts`
Tworzy konto.

Request:
```json
{
  "name": "Konto główne",
  "type": "bank",
  "currency": "PLN",
  "openingBalance": "1000.00"
}
```

### `PATCH /api/v1/workspaces/:workspaceId/accounts/:accountId`
Aktualizacja konta.

### `DELETE /api/v1/workspaces/:workspaceId/accounts/:accountId`
Soft delete konta.

## 7. Categories

### `GET /api/v1/workspaces/:workspaceId/categories`
Lista kategorii.

### `POST /api/v1/workspaces/:workspaceId/categories`
Tworzy kategorię.

Request:
```json
{
  "name": "Jedzenie",
  "kind": "expense",
  "color": "#22c55e"
}
```

### `PATCH /api/v1/workspaces/:workspaceId/categories/:categoryId`
Aktualizacja kategorii.

### `DELETE /api/v1/workspaces/:workspaceId/categories/:categoryId`
Soft delete.

## 8. Transactions

### `GET /api/v1/workspaces/:workspaceId/transactions`
Lista transakcji.

Obsługa filtrów:
- `from`
- `to`
- `accountId`
- `categoryId`
- `type`
- `page`
- `pageSize`

Przykład:
`GET /api/v1/workspaces/ws-1/transactions?from=2026-03-01&to=2026-03-31`

Response:
```json
{
  "items": [
    {
      "id": "txn-1",
      "workspaceId": "ws-1",
      "accountId": "acc-1",
      "categoryId": "cat-1",
      "type": "expense",
      "amount": "120.00",
      "currency": "PLN",
      "description": "Zakupy",
      "transactionDate": "2026-03-10",
      "version": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

### `POST /api/v1/workspaces/:workspaceId/transactions`
Tworzy transakcję.

Request:
```json
{
  "accountId": "acc-1",
  "categoryId": "cat-1",
  "type": "expense",
  "amount": "120.00",
  "currency": "PLN",
  "description": "Zakupy",
  "notes": "Biedronka",
  "transactionDate": "2026-03-10"
}
```

### `GET /api/v1/workspaces/:workspaceId/transactions/:transactionId`
Szczegóły transakcji.

### `PATCH /api/v1/workspaces/:workspaceId/transactions/:transactionId`
Aktualizacja transakcji.

### `DELETE /api/v1/workspaces/:workspaceId/transactions/:transactionId`
Soft delete.

## 9. Transfers
Na start transfer może być obsługiwany przez ten sam endpoint transakcji albo dedykowany endpoint.

Rekomendacja: dedykowany endpoint biznesowy.

### `POST /api/v1/workspaces/:workspaceId/transfers`
Tworzy transfer między dwoma kontami.

Request:
```json
{
  "fromAccountId": "acc-1",
  "toAccountId": "acc-2",
  "amount": "500.00",
  "currency": "PLN",
  "description": "Przelew na oszczędności",
  "transactionDate": "2026-03-10"
}
```

## 10. Budgets

### `GET /api/v1/workspaces/:workspaceId/budget-periods`
Lista okresów budżetowych.

### `POST /api/v1/workspaces/:workspaceId/budget-periods`
Tworzy okres budżetowy.

### `GET /api/v1/workspaces/:workspaceId/budget-limits`
Lista limitów budżetowych.

### `POST /api/v1/workspaces/:workspaceId/budget-limits`
Tworzy limit budżetowy.

Request:
```json
{
  "budgetPeriodId": "bp-1",
  "categoryId": "cat-1",
  "amount": "1000.00",
  "currency": "PLN"
}
```

### `PATCH /api/v1/workspaces/:workspaceId/budget-limits/:budgetLimitId`
Aktualizacja limitu.

### `DELETE /api/v1/workspaces/:workspaceId/budget-limits/:budgetLimitId`
Soft delete.

## 11. Reports

### `GET /api/v1/workspaces/:workspaceId/reports/summary`
Podstawowe podsumowanie.

Parametry:
- `from`
- `to`

Response:
```json
{
  "incomeTotal": "10000.00",
  "expenseTotal": "4200.00",
  "balance": "5800.00",
  "currency": "PLN"
}
```

### `GET /api/v1/workspaces/:workspaceId/reports/by-category`
Suma wydatków per kategoria.

## 12. Synchronizacja

### `POST /api/v1/sync/push`
Wysyła lokalne operacje.

Request:
```json
{
  "deviceId": "device-1",
  "workspaceId": "ws-1",
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

Response:
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

### `GET /api/v1/sync/pull`
Pobiera zmiany od kursora.

Parametry:
- `workspaceId`
- `cursor`
- `limit`

Response:
```json
{
  "changes": [
    {
      "changeId": 121,
      "entityType": "transaction",
      "entityId": "txn-2",
      "operationType": "update",
      "version": 3,
      "changedAt": "2026-03-10T12:00:00Z",
      "payload": {}
    }
  ],
  "nextCursor": 121,
  "hasMore": false
}
```

## 13. Health

### `GET /api/v1/health`
Response:
```json
{
  "status": "ok"
}
```

## 14. Zasady autoryzacji
- użytkownik musi być członkiem workspace,
- rola viewer nie może wykonywać operacji zapisu,
- rola editor może tworzyć i edytować dane,
- rola owner może zarządzać członkami i konfiguracją workspace.

## 15. Zasady kontraktowe
- DTO backendu i frontendu mają być współdzielone logicznie,
- payloady mają być walidowane schematami,
- API ma być gotowe do generowania dokumentacji OpenAPI,
- endpointy sync są częścią kontraktu pierwszej klasy, a nie dodatkiem.

