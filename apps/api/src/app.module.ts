import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseApiEnv } from '@finance/config';

import { AccountsModule } from './modules/accounts/accounts.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SyncModule } from './modules/sync/sync.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (input) => parseApiEnv(input),
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    AccountsModule,
    CategoriesModule,
    RemindersModule,
    TransactionsModule,
    BudgetsModule,
    ReportsModule,
    SyncModule,
    HealthModule,
  ],
})
export class AppModule {}
