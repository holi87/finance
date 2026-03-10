import { z } from 'zod';

const moneyRegex = /^\d+(\.\d{1,2})?$/;
const currencySchema = z.string().length(3).toUpperCase();
const uuidLikeSchema = z.string().min(1);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(16),
});

export const workspaceTypeSchema = z.enum(['personal', 'business', 'company', 'shared']);
export const membershipRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export const accountTypeSchema = z.enum(['cash', 'bank', 'savings', 'credit', 'investment']);
export const categoryKindSchema = z.enum(['expense', 'income', 'both']);
export const transactionTypeSchema = z.enum(['expense', 'income', 'transfer']);
export const periodTypeSchema = z.enum(['monthly']);
export const syncEntityTypeSchema = z.enum([
  'workspace',
  'account',
  'category',
  'transaction',
  'budgetPeriod',
  'budgetLimit',
]);
export const syncOperationTypeSchema = z.enum(['create', 'update', 'delete']);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: workspaceTypeSchema,
  baseCurrency: currencySchema,
});

export const updateWorkspaceSchema = createWorkspaceSchema
  .pick({ name: true, baseCurrency: true })
  .partial()
  .extend({
    archivedAt: z.iso.datetime().nullable().optional(),
  });

export const addMemberSchema = z.object({
  userId: uuidLikeSchema,
  role: membershipRoleSchema,
});

export const updateMemberSchema = z.object({
  role: membershipRoleSchema,
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: accountTypeSchema,
  currency: currencySchema,
  openingBalance: z.string().regex(moneyRegex),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: categoryKindSchema,
  color: z.string().trim().max(32).optional(),
  icon: z.string().trim().max(64).optional(),
  parentCategoryId: uuidLikeSchema.nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  color: z.string().trim().max(32).nullable().optional(),
  icon: z.string().trim().max(64).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const createTransactionSchema = z.object({
  accountId: uuidLikeSchema,
  categoryId: uuidLikeSchema.nullable().optional(),
  type: transactionTypeSchema,
  amount: z.string().regex(moneyRegex),
  currency: currencySchema,
  description: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(500).optional(),
  transactionDate: z.iso.date(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const createTransferSchema = z.object({
  fromAccountId: uuidLikeSchema,
  toAccountId: uuidLikeSchema,
  amount: z.string().regex(moneyRegex),
  currency: currencySchema,
  description: z.string().trim().max(160).optional(),
  transactionDate: z.iso.date(),
});

export const createBudgetPeriodSchema = z.object({
  periodType: periodTypeSchema,
  startsAt: z.iso.date(),
  endsAt: z.iso.date(),
});

export const createBudgetLimitSchema = z.object({
  budgetPeriodId: uuidLikeSchema,
  categoryId: uuidLikeSchema,
  amount: z.string().regex(moneyRegex),
  currency: currencySchema,
});

export const updateBudgetLimitSchema = z.object({
  amount: z.string().regex(moneyRegex).optional(),
  currency: currencySchema.optional(),
});

export const pushOperationSchema = z.object({
  operationId: uuidLikeSchema,
  entityType: syncEntityTypeSchema,
  entityId: uuidLikeSchema,
  operationType: syncOperationTypeSchema,
  baseVersion: z.number().int().min(0),
  payload: z.record(z.string(), z.unknown()),
});

export const pushSchema = z.object({
  deviceId: uuidLikeSchema,
  workspaceId: uuidLikeSchema,
  operations: z.array(pushOperationSchema),
});

export const pullQuerySchema = z.object({
  workspaceId: uuidLikeSchema,
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  deviceId: uuidLikeSchema.optional(),
});

export const transactionFiltersSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  accountId: uuidLikeSchema.optional(),
  categoryId: uuidLikeSchema.optional(),
  type: transactionTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateBudgetLimitInput = z.infer<typeof createBudgetLimitSchema>;
export type PushInput = z.infer<typeof pushSchema>;
