export type EntityId = string;
export type CurrencyCode = string;
export type MoneyString = string;
export type ISODateString = string;
export type ISODateTimeString = string;

export type WorkspaceType = 'personal' | 'business' | 'company' | 'shared';
export type MembershipRole = 'owner' | 'editor' | 'viewer';
export type AccountType = 'cash' | 'bank' | 'savings' | 'credit' | 'investment';
export type CategoryKind = 'expense' | 'income' | 'both';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type PeriodType = 'monthly';
export type ReminderScheduleType = 'once' | 'monthly';
export type SyncEntityType =
  | 'workspace'
  | 'account'
  | 'category'
  | 'transaction'
  | 'budgetPeriod'
  | 'budgetLimit'
  | 'reminder';
export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncOperationStatus =
  | 'pending'
  | 'processing'
  | 'applied'
  | 'failed'
  | 'conflict';

export interface TimestampedEntity {
  id: EntityId;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  version: number;
  deletedAt: ISODateTimeString | null;
}

export interface User {
  id: EntityId;
  email: string;
  displayName: string;
  isActive: boolean;
  isSystemAdmin: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  lastLoginAt: ISODateTimeString | null;
}

export interface WorkspaceSummary {
  id: EntityId;
  name: string;
  slug: string;
  type: WorkspaceType;
  baseCurrency: CurrencyCode;
  role: MembershipRole;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  ownerId: EntityId;
  archivedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface AdminWorkspaceSummary {
  id: EntityId;
  name: string;
  slug: string;
  type: WorkspaceType;
  baseCurrency: CurrencyCode;
  ownerId: EntityId;
  ownerDisplayName: string;
  ownerEmail: string;
  archivedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  memberCount: number;
  accountCount: number;
  transactionCount: number;
}

export interface Membership {
  id: EntityId;
  workspaceId: EntityId;
  userId: EntityId;
  role: MembershipRole;
  invitedBy: EntityId | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  user?: Pick<User, 'id' | 'email' | 'displayName'>;
}

export interface Account extends TimestampedEntity {
  workspaceId: EntityId;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalance: MoneyString;
  currentBalanceCached: MoneyString;
  isArchived: boolean;
}

export interface Category extends TimestampedEntity {
  workspaceId: EntityId;
  parentCategoryId: EntityId | null;
  name: string;
  kind: CategoryKind;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
}

export interface Transaction extends TimestampedEntity {
  workspaceId: EntityId;
  accountId: EntityId;
  categoryId: EntityId | null;
  type: TransactionType;
  amount: MoneyString;
  currency: CurrencyCode;
  description: string | null;
  notes: string | null;
  transactionDate: ISODateString;
  createdBy: EntityId;
}

export interface TransferLink {
  id: EntityId;
  workspaceId: EntityId;
  outboundTransactionId: EntityId;
  inboundTransactionId: EntityId;
  createdAt: ISODateTimeString;
}

export interface BudgetPeriod {
  id: EntityId;
  workspaceId: EntityId;
  periodType: PeriodType;
  startsAt: ISODateString;
  endsAt: ISODateString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface BudgetLimit extends TimestampedEntity {
  workspaceId: EntityId;
  budgetPeriodId: EntityId;
  categoryId: EntityId;
  amount: MoneyString;
  currency: CurrencyCode;
}

export interface Reminder extends TimestampedEntity {
  workspaceId: EntityId;
  title: string;
  notes: string | null;
  amount: MoneyString;
  currency: CurrencyCode;
  accountId: EntityId | null;
  categoryId: EntityId | null;
  scheduleType: ReminderScheduleType;
  dueDate: ISODateString | null;
  dueDayOfMonth: number | null;
  isActive: boolean;
  lastCompletedAt: ISODateString | null;
}

export interface ReportSummary {
  incomeTotal: MoneyString;
  expenseTotal: MoneyString;
  balance: MoneyString;
  currency: CurrencyCode;
}

export interface ReportByCategoryItem {
  categoryId: EntityId;
  categoryName: string;
  total: MoneyString;
  currency: CurrencyCode;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'displayName' | 'isSystemAdmin'>;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface CreateUserWorkspaceRequest {
  name: string;
  type: WorkspaceType;
  baseCurrency: CurrencyCode;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  isSystemAdmin?: boolean;
  workspace?: CreateUserWorkspaceRequest;
}

export interface UpdateUserRequest {
  email?: string;
  displayName?: string;
  password?: string;
  isActive?: boolean;
  isSystemAdmin?: boolean;
}

export interface CreateWorkspaceRequest {
  name: string;
  type: WorkspaceType;
  baseCurrency: CurrencyCode;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  type?: WorkspaceType;
  baseCurrency?: CurrencyCode;
  archivedAt?: ISODateTimeString | null;
}

export interface AddMemberRequest {
  userId: EntityId;
  role: MembershipRole;
}

export interface UpdateMemberRequest {
  role: MembershipRole;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalance: MoneyString;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  currency?: CurrencyCode;
  openingBalance?: MoneyString;
  isArchived?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  kind: CategoryKind;
  color?: string;
  icon?: string;
  parentCategoryId?: EntityId | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  kind?: CategoryKind;
  color?: string | null;
  icon?: string | null;
  isArchived?: boolean;
  parentCategoryId?: EntityId | null;
}

export interface CreateTransactionRequest {
  accountId: EntityId;
  categoryId?: EntityId | null;
  type: TransactionType;
  amount: MoneyString;
  currency: CurrencyCode;
  description?: string;
  notes?: string;
  transactionDate: ISODateString;
}

export interface UpdateTransactionRequest {
  accountId?: EntityId;
  categoryId?: EntityId | null;
  type?: TransactionType;
  amount?: MoneyString;
  currency?: CurrencyCode;
  description?: string | null;
  notes?: string | null;
  transactionDate?: ISODateString;
}

export interface CreateTransferRequest {
  fromAccountId: EntityId;
  toAccountId: EntityId;
  amount: MoneyString;
  currency: CurrencyCode;
  description?: string;
  transactionDate: ISODateString;
}

export interface CreateBudgetPeriodRequest {
  periodType: PeriodType;
  startsAt: ISODateString;
  endsAt: ISODateString;
}

export interface CreateBudgetLimitRequest {
  budgetPeriodId: EntityId;
  categoryId: EntityId;
  amount: MoneyString;
  currency: CurrencyCode;
}

export interface UpdateBudgetLimitRequest {
  amount?: MoneyString;
  currency?: CurrencyCode;
}

export interface CreateReminderRequest {
  title: string;
  notes?: string;
  amount: MoneyString;
  currency: CurrencyCode;
  accountId: EntityId;
  categoryId?: EntityId | null;
  scheduleType: ReminderScheduleType;
  dueDate?: ISODateString | null;
  dueDayOfMonth?: number | null;
}

export interface UpdateReminderRequest {
  title?: string;
  notes?: string | null;
  amount?: MoneyString;
  currency?: CurrencyCode;
  accountId?: EntityId | null;
  categoryId?: EntityId | null;
  scheduleType?: ReminderScheduleType;
  dueDate?: ISODateString | null;
  dueDayOfMonth?: number | null;
  isActive?: boolean;
  lastCompletedAt?: ISODateString | null;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TransactionFilters {
  from?: ISODateString;
  to?: ISODateString;
  accountId?: EntityId;
  categoryId?: EntityId;
  type?: TransactionType;
  page?: number;
  pageSize?: number;
}

export interface SyncOperation<TPayload = unknown> {
  operationId: string;
  deviceId: EntityId;
  workspaceId: EntityId;
  entityType: SyncEntityType;
  entityId: EntityId;
  operationType: SyncOperationType;
  baseVersion: number;
  payload: TPayload;
  createdAt: ISODateTimeString;
  retryCount: number;
  status: SyncOperationStatus;
  errorMessage?: string;
}

export interface PushRequest {
  deviceId: EntityId;
  workspaceId: EntityId;
  operations: Array<
    Pick<
      SyncOperation,
      | 'operationId'
      | 'entityType'
      | 'entityId'
      | 'operationType'
      | 'baseVersion'
      | 'payload'
    >
  >;
}

export interface AcceptedOperation {
  operationId: string;
  entityType: SyncEntityType;
  entityId: EntityId;
  newVersion: number;
  status: 'applied';
}

export interface RejectedOperation {
  operationId: string;
  entityType: SyncEntityType;
  entityId: EntityId;
  status: 'failed' | 'conflict';
  message: string;
}

export interface PushResponse {
  accepted: AcceptedOperation[];
  rejected: RejectedOperation[];
}

export interface SyncChange<TPayload = unknown> {
  changeId: number;
  entityType: SyncEntityType;
  entityId: EntityId;
  operationType: SyncOperationType;
  version: number;
  changedAt: ISODateTimeString;
  payload: TPayload;
}

export interface PullResponse<TPayload = unknown> {
  changes: SyncChange<TPayload>[];
  nextCursor: number;
  hasMore: boolean;
}

export interface SyncState {
  workspaceId: EntityId;
  pendingOperations: number;
  lastSyncedAt: ISODateTimeString | null;
  lastCursor: number;
  status: 'idle' | 'offline' | 'syncing' | 'error' | 'success';
  errorMessage: string | null;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
