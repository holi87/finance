import {
  PrismaClient,
  WorkspaceType,
  MembershipRole,
  AccountType,
  CategoryKind,
  PeriodType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('demo12345');

  const user = await prisma.user.upsert({
    where: { email: 'demo@budget.local' },
    update: {
      passwordHash,
      displayName: 'Demo User',
      isActive: true,
    },
    create: {
      email: 'demo@budget.local',
      passwordHash,
      displayName: 'Demo User',
      isActive: true,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      ownerId_slug: {
        ownerId: user.id,
        slug: 'domowy',
      },
    },
    update: {
      name: 'Domowy',
      baseCurrency: 'PLN',
      type: WorkspaceType.personal,
    },
    create: {
      name: 'Domowy',
      slug: 'domowy',
      type: WorkspaceType.personal,
      baseCurrency: 'PLN',
      ownerId: user.id,
      memberships: {
        create: {
          userId: user.id,
          role: MembershipRole.owner,
        },
      },
    },
  });

  const account = await prisma.account.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: workspace.id,
      name: 'Konto główne',
      type: AccountType.bank,
      currency: 'PLN',
      openingBalance: 2500,
      currentBalanceCached: 2500,
    },
  });

  const category = await prisma.category.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      workspaceId: workspace.id,
      name: 'Jedzenie',
      kind: CategoryKind.expense,
      color: '#89f336',
    },
  });

  const period = await prisma.budgetPeriod.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      workspaceId: workspace.id,
      periodType: PeriodType.monthly,
      startsAt: new Date('2026-03-01'),
      endsAt: new Date('2026-03-31'),
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
    update: {},
    create: {
      workspaceId: workspace.id,
      budgetPeriodId: period.id,
      categoryId: category.id,
      amount: 1500,
      currency: 'PLN',
    },
  });

  await prisma.transaction.upsert({
    where: { id: '00000000-0000-4000-8000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000004',
      workspaceId: workspace.id,
      accountId: account.id,
      categoryId: category.id,
      type: 'expense',
      amount: 145.2,
      currency: 'PLN',
      description: 'Zakupy tygodniowe',
      notes: 'Seed',
      transactionDate: new Date('2026-03-08'),
      createdBy: user.id,
    },
  });
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
