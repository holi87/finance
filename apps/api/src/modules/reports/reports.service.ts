import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TransactionFilters } from '@finance/shared-types';

import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getSummary(
    userId: string,
    workspaceId: string,
    filters: TransactionFilters,
  ) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        transactionDate:
          filters.from || filters.to
            ? {
                gte: filters.from ? new Date(filters.from) : undefined,
                lte: filters.to ? new Date(filters.to) : undefined,
              }
            : undefined,
      },
      select: {
        type: true,
        amount: true,
        currency: true,
      },
    });

    const summary = transactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income = accumulator.income.plus(transaction.amount);
        }
        if (transaction.type === 'expense') {
          accumulator.expense = accumulator.expense.plus(transaction.amount);
        }
        return accumulator;
      },
      {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      },
    );

    const currency = transactions[0]?.currency ?? 'PLN';
    const balance = summary.income.minus(summary.expense);

    return {
      incomeTotal: summary.income.toFixed(2),
      expenseTotal: summary.expense.toFixed(2),
      balance: balance.toFixed(2),
      currency,
    };
  }

  async getByCategory(
    userId: string,
    workspaceId: string,
    filters: TransactionFilters,
  ) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        type: 'expense',
        categoryId: {
          not: null,
        },
        transactionDate:
          filters.from || filters.to
            ? {
                gte: filters.from ? new Date(filters.from) : undefined,
                lte: filters.to ? new Date(filters.to) : undefined,
              }
            : undefined,
      },
      include: {
        category: true,
      },
    });

    const grouped = new Map<
      string,
      { categoryName: string; total: Prisma.Decimal; currency: string }
    >();

    for (const transaction of transactions) {
      if (!transaction.category) {
        continue;
      }
      const categoryId = transaction.categoryId;
      if (!categoryId) {
        continue;
      }
      const existing = grouped.get(categoryId);
      grouped.set(categoryId, {
        categoryName: transaction.category.name,
        total: existing
          ? existing.total.plus(transaction.amount)
          : new Prisma.Decimal(transaction.amount),
        currency: transaction.currency,
      });
    }

    return [...grouped.entries()].map(([categoryId, value]) => ({
      categoryId,
      categoryName: value.categoryName,
      total: value.total.toFixed(2),
      currency: value.currency,
    }));
  }
}
