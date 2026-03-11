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

export const workspaceTypeSchema = z.enum([
  'personal',
  'business',
  'company',
  'shared',
]);
export const membershipRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export const accountTypeSchema = z.enum([
  'cash',
  'bank',
  'savings',
  'credit',
  'investment',
]);
export const categoryKindSchema = z.enum(['expense', 'income', 'both']);
export const transactionTypeSchema = z.enum(['expense', 'income', 'transfer']);
export const periodTypeSchema = z.enum(['monthly']);
export const reminderScheduleTypeSchema = z.enum(['once', 'monthly']);
export const syncEntityTypeSchema = z.enum([
  'workspace',
  'account',
  'category',
  'transaction',
  'budgetPeriod',
  'budgetLimit',
  'reminder',
]);
export const syncOperationTypeSchema = z.enum(['create', 'update', 'delete']);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: workspaceTypeSchema,
  baseCurrency: currencySchema,
});

export const updateWorkspaceSchema = createWorkspaceSchema
  .pick({ name: true, type: true, baseCurrency: true })
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

export const createUserWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: workspaceTypeSchema,
  baseCurrency: currencySchema,
});

export const createUserSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(8),
  isSystemAdmin: z.boolean().optional(),
  workspace: createUserWorkspaceSchema.optional(),
});

export const updateUserSchema = z.object({
  email: z.email().optional(),
  displayName: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
  isSystemAdmin: z.boolean().optional(),
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

export const createReminderSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    notes: z.string().trim().max(500).optional(),
    amount: z.string().regex(moneyRegex),
    currency: currencySchema,
    accountId: uuidLikeSchema,
    categoryId: uuidLikeSchema.nullable().optional(),
    scheduleType: reminderScheduleTypeSchema,
    dueDate: z.iso.date().nullable().optional(),
    dueDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.scheduleType === 'once' && !value.dueDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'One-time reminder requires dueDate',
      });
    }

    if (value.scheduleType === 'monthly' && !value.dueDayOfMonth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDayOfMonth'],
        message: 'Monthly reminder requires dueDayOfMonth',
      });
    }
  });

export const updateReminderSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    amount: z.string().regex(moneyRegex).optional(),
    currency: currencySchema.optional(),
    accountId: uuidLikeSchema.nullable().optional(),
    categoryId: uuidLikeSchema.nullable().optional(),
    scheduleType: reminderScheduleTypeSchema.optional(),
    dueDate: z.iso.date().nullable().optional(),
    dueDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    isActive: z.boolean().optional(),
    lastCompletedAt: z.iso.date().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.scheduleType === 'once' && value.dueDate === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'One-time reminder update should provide dueDate',
      });
    }

    if (
      value.scheduleType === 'monthly' &&
      value.dueDayOfMonth === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDayOfMonth'],
        message: 'Monthly reminder update should provide dueDayOfMonth',
      });
    }
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
