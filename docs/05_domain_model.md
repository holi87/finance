# Budget Tracker — Model domenowy

## 1. Główny model biznesowy
System jest zorganizowany wokół pojęcia **Workspace** — niezależnej przestrzeni finansowej.

Przykłady:
- domowy,
- JDG,
- spółka,
- wspólny budżet.

Workspace jest główną granicą:
- danych,
- uprawnień,
- raportów,
- kategorii,
- kont,
- budżetów.

## 2. Główne encje

### User
Reprezentuje użytkownika systemu.

Atrybuty przykładowe:
- id,
- email,
- passwordHash,
- displayName,
- createdAt,
- updatedAt,
- lastLoginAt,
- isActive.

### Device
Reprezentuje urządzenie użytkownika istotne dla synchronizacji.

Atrybuty:
- id,
- userId,
- deviceName,
- platform,
- lastSeenAt,
- createdAt.

### Workspace
Reprezentuje przestrzeń finansową.

Atrybuty:
- id,
- name,
- slug,
- type,
- baseCurrency,
- ownerId,
- createdAt,
- updatedAt,
- archivedAt.

Przykładowe typy:
- personal,
- business,
- company,
- shared.

### Membership
Powiązanie użytkownika z workspace.

Atrybuty:
- id,
- workspaceId,
- userId,
- role,
- invitedBy,
- createdAt,
- updatedAt.

Role:
- owner,
- editor,
- viewer.

### Account
Konto finansowe w obrębie workspace.

Atrybuty:
- id,
- workspaceId,
- name,
- type,
- currency,
- openingBalance,
- currentBalanceCached,
- isArchived,
- createdAt,
- updatedAt.

Przykładowe typy:
- cash,
- bank,
- savings,
- credit,
- investment.

### Category
Kategoria finansowa.

Atrybuty:
- id,
- workspaceId,
- name,
- kind,
- color,
- icon,
- parentCategoryId,
- isArchived,
- createdAt,
- updatedAt.

Kind:
- expense,
- income,
- both.

### Transaction
Podstawowa operacja finansowa.

Atrybuty:
- id,
- workspaceId,
- accountId,
- categoryId,
- type,
- amount,
- currency,
- description,
- transactionDate,
- notes,
- createdBy,
- createdAt,
- updatedAt,
- deletedAt,
- version.

Type:
- expense,
- income,
- transfer.

### TransferLink
Powiązanie dwóch transakcji reprezentujących transfer między kontami.

Atrybuty:
- id,
- workspaceId,
- outboundTransactionId,
- inboundTransactionId,
- createdAt.

### BudgetPeriod
Okres budżetowy.

Atrybuty:
- id,
- workspaceId,
- periodType,
- startsAt,
- endsAt,
- createdAt,
- updatedAt.

Na start rekomendowane:
- monthly.

### BudgetLimit
Limit budżetowy dla kategorii w danym okresie.

Atrybuty:
- id,
- workspaceId,
- budgetPeriodId,
- categoryId,
- amount,
- currency,
- createdAt,
- updatedAt,
- version.

### Tag
Opcjonalne tagowanie transakcji.

Atrybuty:
- id,
- workspaceId,
- name,
- color,
- createdAt,
- updatedAt.

### TransactionTag
Tabela łącząca transakcję z tagiem.

### Attachment
Encja przyszłościowa dla załączników.

Atrybuty:
- id,
- workspaceId,
- transactionId,
- fileName,
- mimeType,
- storageKey,
- createdAt.

## 3. Encje synchronizacji

### SyncOutboxItem
Lokalna encja klienta, niekoniecznie trzymana 1:1 na backendzie.

Atrybuty:
- id,
- deviceId,
- workspaceId,
- entityType,
- entityId,
- operationType,
- payload,
- createdAt,
- retryCount,
- status.

### SyncCursor
Stan ostatniej zsynchronizowanej zmiany.

Atrybuty:
- id,
- userId,
- deviceId,
- workspaceId,
- lastPulledChangeId,
- updatedAt.

### SyncChange
Zdarzenie zmian na backendzie potrzebne do pull sync.

Atrybuty:
- id,
- workspaceId,
- entityType,
- entityId,
- operationType,
- entityVersion,
- changedAt,
- changedBy,
- payloadSnapshot.

## 4. Relacje między encjami
- User ma wiele Membership.
- Workspace ma wiele Membership.
- Workspace ma wiele Account.
- Workspace ma wiele Category.
- Workspace ma wiele Transaction.
- Workspace ma wiele BudgetPeriod.
- BudgetPeriod ma wiele BudgetLimit.
- Category może mieć relację parent-child.
- Transaction należy do Account.
- Transaction opcjonalnie należy do Category.
- Transaction może mieć wiele Tag przez TransactionTag.
- Transfer jest reprezentowany jako powiązanie dwóch transakcji.

## 5. Zasady domenowe

### Izolacja workspace
Żadna encja finansowa nie może istnieć bez przypisania do workspace.

### Spójność konta
Transfer powinien dotyczyć dwóch kont w tym samym workspace, chyba że w przyszłości świadomie zostanie dodany cross-workspace transfer.

### Kategorie
Kategorie są per workspace, nie globalne.

### Budżety
Budżety są definiowane na poziomie workspace i okresu.

### Usuwanie
Dla sync zalecane jest soft delete zamiast twardego usuwania dla encji finansowych.

## 6. Minimalne agregaty domenowe
Na start rozsądne agregaty:
- Workspace,
- Account,
- Transaction,
- Budget.

Nie należy na MVP przesadzać z bardzo formalnym DDD, ale granice odpowiedzialności powinny być jasne.

## 7. Pola techniczne wymagane do synchronizacji
Dla encji synchronizowanych zalecane pola:
- id,
- createdAt,
- updatedAt,
- version,
- deletedAt,
- workspaceId.

## 8. Wnioski projektowe
Model domenowy powinien być prosty, ale rozwojowy.

Najważniejsze decyzje:
- workspace jako główna granica,
- transakcja jako podstawowa jednostka biznesowa,
- osobne konto i kategoria,
- osobne encje synchronizacji,
- przygotowanie modelu pod współdzielenie i offline-first.

