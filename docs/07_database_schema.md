# Budget Tracker — Schemat bazy danych

## 1. Założenia
Centralna baza danych to PostgreSQL.

Schemat ma wspierać:
- wiele workspace’ów,
- izolację danych,
- role użytkowników,
- historię transakcji,
- budżety,
- synchronizację offline-first,
- wersjonowanie rekordów,
- soft delete.

## 2. Główne tabele

### users
Kolumny:
- id UUID PK
- email TEXT UNIQUE NOT NULL
- password_hash TEXT NOT NULL
- display_name TEXT NOT NULL
- is_active BOOLEAN NOT NULL DEFAULT true
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- last_login_at TIMESTAMPTZ NULL

### devices
Kolumny:
- id UUID PK
- user_id UUID NOT NULL FK -> users.id
- device_name TEXT NOT NULL
- platform TEXT NOT NULL
- last_seen_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### workspaces
Kolumny:
- id UUID PK
- name TEXT NOT NULL
- slug TEXT NOT NULL
- type TEXT NOT NULL
- base_currency CHAR(3) NOT NULL
- owner_id UUID NOT NULL FK -> users.id
- archived_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

Ograniczenia:
- UNIQUE(owner_id, slug) lub globalnie unique slug, zależnie od preferencji

### memberships
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- user_id UUID NOT NULL FK -> users.id
- role TEXT NOT NULL
- invited_by UUID NULL FK -> users.id
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

Ograniczenia:
- UNIQUE(workspace_id, user_id)

### accounts
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- name TEXT NOT NULL
- type TEXT NOT NULL
- currency CHAR(3) NOT NULL
- opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0
- current_balance_cached NUMERIC(18,2) NOT NULL DEFAULT 0
- is_archived BOOLEAN NOT NULL DEFAULT false
- version INTEGER NOT NULL DEFAULT 1
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- deleted_at TIMESTAMPTZ NULL

### categories
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- parent_category_id UUID NULL FK -> categories.id
- name TEXT NOT NULL
- kind TEXT NOT NULL
- color TEXT NULL
- icon TEXT NULL
- is_archived BOOLEAN NOT NULL DEFAULT false
- version INTEGER NOT NULL DEFAULT 1
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- deleted_at TIMESTAMPTZ NULL

### transactions
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- account_id UUID NOT NULL FK -> accounts.id
- category_id UUID NULL FK -> categories.id
- type TEXT NOT NULL
- amount NUMERIC(18,2) NOT NULL
- currency CHAR(3) NOT NULL
- description TEXT NULL
- notes TEXT NULL
- transaction_date DATE NOT NULL
- created_by UUID NOT NULL FK -> users.id
- version INTEGER NOT NULL DEFAULT 1
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- deleted_at TIMESTAMPTZ NULL

### transfer_links
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- outbound_transaction_id UUID NOT NULL FK -> transactions.id
- inbound_transaction_id UUID NOT NULL FK -> transactions.id
- created_at TIMESTAMPTZ NOT NULL

### budget_periods
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- period_type TEXT NOT NULL
- starts_at DATE NOT NULL
- ends_at DATE NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### budget_limits
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- budget_period_id UUID NOT NULL FK -> budget_periods.id
- category_id UUID NOT NULL FK -> categories.id
- amount NUMERIC(18,2) NOT NULL
- currency CHAR(3) NOT NULL
- version INTEGER NOT NULL DEFAULT 1
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- deleted_at TIMESTAMPTZ NULL

Ograniczenia:
- UNIQUE(workspace_id, budget_period_id, category_id)

### tags
Kolumny:
- id UUID PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- name TEXT NOT NULL
- color TEXT NULL
- version INTEGER NOT NULL DEFAULT 1
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- deleted_at TIMESTAMPTZ NULL

### transaction_tags
Kolumny:
- transaction_id UUID NOT NULL FK -> transactions.id
- tag_id UUID NOT NULL FK -> tags.id

PK:
- PRIMARY KEY(transaction_id, tag_id)

## 3. Tabele synchronizacji

### sync_changes
Służy do rejestrowania zmian do endpointu pull.

Kolumny:
- id BIGSERIAL PK
- workspace_id UUID NOT NULL FK -> workspaces.id
- entity_type TEXT NOT NULL
- entity_id UUID NOT NULL
- operation_type TEXT NOT NULL
- entity_version INTEGER NOT NULL
- changed_by UUID NULL FK -> users.id
- changed_at TIMESTAMPTZ NOT NULL
- payload_snapshot JSONB NULL

### sync_operation_receipts
Służy do idempotencji push.

Kolumny:
- id BIGSERIAL PK
- operation_id TEXT NOT NULL
- device_id UUID NOT NULL FK -> devices.id
- workspace_id UUID NOT NULL FK -> workspaces.id
- entity_type TEXT NOT NULL
- entity_id UUID NOT NULL
- operation_type TEXT NOT NULL
- processed_at TIMESTAMPTZ NOT NULL
- result_status TEXT NOT NULL

Ograniczenia:
- UNIQUE(operation_id, device_id)

### sync_cursors
Kolumny:
- id UUID PK
- user_id UUID NOT NULL FK -> users.id
- device_id UUID NOT NULL FK -> devices.id
- workspace_id UUID NOT NULL FK -> workspaces.id
- last_pulled_change_id BIGINT NOT NULL DEFAULT 0
- updated_at TIMESTAMPTZ NOT NULL

Ograniczenia:
- UNIQUE(user_id, device_id, workspace_id)

## 4. Indeksy rekomendowane

### memberships
- INDEX ON (user_id)
- INDEX ON (workspace_id)

### accounts
- INDEX ON (workspace_id, is_archived)
- INDEX ON (workspace_id, deleted_at)

### categories
- INDEX ON (workspace_id, kind)
- INDEX ON (workspace_id, deleted_at)

### transactions
- INDEX ON (workspace_id, transaction_date DESC)
- INDEX ON (workspace_id, account_id)
- INDEX ON (workspace_id, category_id)
- INDEX ON (workspace_id, deleted_at)
- INDEX ON (workspace_id, updated_at)

### budget_limits
- INDEX ON (workspace_id, budget_period_id)

### sync_changes
- INDEX ON (workspace_id, id)
- INDEX ON (workspace_id, changed_at)
- INDEX ON (workspace_id, entity_type, entity_id)

## 5. Zasady integralności
- wszystkie encje finansowe muszą mieć `workspace_id`,
- dane nie mogą przeciekać między workspace’ami,
- soft delete dla encji synchronizowanych,
- `version` zwiększane przy każdej zmianie,
- wpis do `sync_changes` tworzony przy każdej zmianie encji synchronizowanej.

## 6. Uwagi implementacyjne
- dla typów enum można użyć PostgreSQL enum albo prostych pól tekstowych walidowanych w aplikacji,
- na MVP prostsze będzie użycie tekstu + walidacja aplikacyjna,
- `payload_snapshot` w `sync_changes` może przechowywać pełny snapshot lub minimalny payload zależnie od strategii.

## 7. Wniosek
Schemat powinien być przygotowany pod:
- izolację danych per workspace,
- raportowanie,
- wersjonowanie,
- synchronizację,
- dalszą rozbudowę bez przebudowy fundamentów.

