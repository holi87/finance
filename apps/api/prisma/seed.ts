import {
  AccountType,
  CategoryKind,
  MembershipRole,
  PeriodType,
  PrismaClient,
  WorkspaceType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const demoWorkspaces = [
  {
    slug: 'domowy',
    name: 'Domowy',
    type: WorkspaceType.personal,
    baseCurrency: 'PLN',
    account: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Konto główne',
      type: AccountType.bank,
      openingBalance: 2500,
      currentBalanceCached: 2354.8,
    },
    category: {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Jedzenie',
      kind: CategoryKind.expense,
      color: '#89f336',
    },
    period: {
      id: '00000000-0000-4000-8000-000000000003',
      startsAt: new Date('2026-03-01'),
      endsAt: new Date('2026-03-31'),
    },
    budgetLimit: {
      amount: 1500,
      currency: 'PLN',
    },
    transaction: {
      id: '00000000-0000-4000-8000-000000000004',
      type: 'expense' as const,
      amount: 145.2,
      currency: 'PLN',
      description: 'Zakupy tygodniowe',
      notes: 'Seed',
      transactionDate: new Date('2026-03-08'),
    },
  },
  {
    slug: 'jdg',
    name: 'JDG',
    type: WorkspaceType.business,
    baseCurrency: 'PLN',
    account: {
      id: '00000000-0000-4000-8000-000000000011',
      name: 'Konto działalności',
      type: AccountType.bank,
      openingBalance: 12000,
      currentBalanceCached: 11840,
    },
    category: {
      id: '00000000-0000-4000-8000-000000000012',
      name: 'Paliwo',
      kind: CategoryKind.expense,
      color: '#ffb84d',
    },
    period: {
      id: '00000000-0000-4000-8000-000000000013',
      startsAt: new Date('2026-03-01'),
      endsAt: new Date('2026-03-31'),
    },
    budgetLimit: {
      amount: 800,
      currency: 'PLN',
    },
    transaction: {
      id: '00000000-0000-4000-8000-000000000014',
      type: 'expense' as const,
      amount: 160,
      currency: 'PLN',
      description: 'Tankowanie',
      notes: 'Seed JDG',
      transactionDate: new Date('2026-03-06'),
    },
  },
  {
    slug: 'firma',
    name: 'Firma',
    type: WorkspaceType.company,
    baseCurrency: 'PLN',
    account: {
      id: '00000000-0000-4000-8000-000000000021',
      name: 'Rachunek operacyjny',
      type: AccountType.bank,
      openingBalance: 45000,
      currentBalanceCached: 42200,
    },
    category: {
      id: '00000000-0000-4000-8000-000000000022',
      name: 'Operacje',
      kind: CategoryKind.expense,
      color: '#5ad0ff',
    },
    period: {
      id: '00000000-0000-4000-8000-000000000023',
      startsAt: new Date('2026-03-01'),
      endsAt: new Date('2026-03-31'),
    },
    budgetLimit: {
      amount: 12000,
      currency: 'PLN',
    },
    transaction: {
      id: '00000000-0000-4000-8000-000000000024',
      type: 'expense' as const,
      amount: 2800,
      currency: 'PLN',
      description: 'Licencje i narzędzia',
      notes: 'Seed firma',
      transactionDate: new Date('2026-03-05'),
    },
  },
] as const;

async function upsertDemoWorkspace(
  userId: string,
  demoWorkspace: (typeof demoWorkspaces)[number],
) {
  const workspace = await prisma.workspace.upsert({
    where: {
      ownerId_slug: {
        ownerId: userId,
        slug: demoWorkspace.slug,
      },
    },
    update: {
      name: demoWorkspace.name,
      baseCurrency: demoWorkspace.baseCurrency,
      type: demoWorkspace.type,
    },
    create: {
      name: demoWorkspace.name,
      slug: demoWorkspace.slug,
      type: demoWorkspace.type,
      baseCurrency: demoWorkspace.baseCurrency,
      ownerId: userId,
      memberships: {
        create: {
          userId,
          role: MembershipRole.owner,
        },
      },
    },
  });

  await prisma.membership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId,
      },
    },
    update: {
      role: MembershipRole.owner,
    },
    create: {
      workspaceId: workspace.id,
      userId,
      role: MembershipRole.owner,
    },
  });

  const account = await prisma.account.upsert({
    where: { id: demoWorkspace.account.id },
    update: {
      workspaceId: workspace.id,
      name: demoWorkspace.account.name,
      type: demoWorkspace.account.type,
      currency: demoWorkspace.baseCurrency,
      openingBalance: demoWorkspace.account.openingBalance,
      currentBalanceCached: demoWorkspace.account.currentBalanceCached,
      isArchived: false,
      deletedAt: null,
    },
    create: {
      id: demoWorkspace.account.id,
      workspaceId: workspace.id,
      name: demoWorkspace.account.name,
      type: demoWorkspace.account.type,
      currency: demoWorkspace.baseCurrency,
      openingBalance: demoWorkspace.account.openingBalance,
      currentBalanceCached: demoWorkspace.account.currentBalanceCached,
    },
  });

  const category = await prisma.category.upsert({
    where: { id: demoWorkspace.category.id },
    update: {
      workspaceId: workspace.id,
      name: demoWorkspace.category.name,
      kind: demoWorkspace.category.kind,
      color: demoWorkspace.category.color,
      isArchived: false,
      deletedAt: null,
    },
    create: {
      id: demoWorkspace.category.id,
      workspaceId: workspace.id,
      name: demoWorkspace.category.name,
      kind: demoWorkspace.category.kind,
      color: demoWorkspace.category.color,
    },
  });

  const period = await prisma.budgetPeriod.upsert({
    where: { id: demoWorkspace.period.id },
    update: {
      workspaceId: workspace.id,
      periodType: PeriodType.monthly,
      startsAt: demoWorkspace.period.startsAt,
      endsAt: demoWorkspace.period.endsAt,
    },
    create: {
      id: demoWorkspace.period.id,
      workspaceId: workspace.id,
      periodType: PeriodType.monthly,
      startsAt: demoWorkspace.period.startsAt,
      endsAt: demoWorkspace.period.endsAt,
    },
  });

  await prisma.budgetLimit.upsert({
    where: {
      workspaceId_budgetPeriodId_categoryId: {
        workspaceId: workspace.id,
        budgetPeriodId: period.id,
        categoryId: category.id,
      },
    },
    update: {
      amount: demoWorkspace.budgetLimit.amount,
      currency: demoWorkspace.budgetLimit.currency,
      deletedAt: null,
    },
    create: {
      workspaceId: workspace.id,
      budgetPeriodId: period.id,
      categoryId: category.id,
      amount: demoWorkspace.budgetLimit.amount,
      currency: demoWorkspace.budgetLimit.currency,
    },
  });

  await prisma.transaction.upsert({
    where: { id: demoWorkspace.transaction.id },
    update: {
      workspaceId: workspace.id,
      accountId: account.id,
      categoryId: category.id,
      type: demoWorkspace.transaction.type,
      amount: demoWorkspace.transaction.amount,
      currency: demoWorkspace.transaction.currency,
      description: demoWorkspace.transaction.description,
      notes: demoWorkspace.transaction.notes,
      transactionDate: demoWorkspace.transaction.transactionDate,
      createdBy: userId,
      deletedAt: null,
    },
    create: {
      id: demoWorkspace.transaction.id,
      workspaceId: workspace.id,
      accountId: account.id,
      categoryId: category.id,
      type: demoWorkspace.transaction.type,
      amount: demoWorkspace.transaction.amount,
      currency: demoWorkspace.transaction.currency,
      description: demoWorkspace.transaction.description,
      notes: demoWorkspace.transaction.notes,
      transactionDate: demoWorkspace.transaction.transactionDate,
      createdBy: userId,
    },
  });
}

async function main() {
  const passwordHash = await argon2.hash('demo12345');

  const user = await prisma.user.upsert({
    where: { email: 'demo@budget.local' },
    update: {
      passwordHash,
      displayName: 'Demo User',
      isActive: true,
      isSystemAdmin: true,
    },
    create: {
      email: 'demo@budget.local',
      passwordHash,
      displayName: 'Demo User',
      isActive: true,
      isSystemAdmin: true,
    },
  });

  for (const demoWorkspace of demoWorkspaces) {
    await upsertDemoWorkspace(user.id, demoWorkspace);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
