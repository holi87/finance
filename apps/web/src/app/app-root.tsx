import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AccountsPage } from '../features/accounts/accounts-page';
import { AdminPage } from '../features/admin/admin-page';
import { AuthProvider, useAuth } from '../features/auth/auth-context';
import { LoginPage } from '../features/auth/login-page';
import { BudgetsPage } from '../features/budgets/budgets-page';
import { CategoriesPage } from '../features/categories/categories-page';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { RemindersPage } from '../features/reminders/reminders-page';
import { SettingsPage } from '../features/settings/settings-page';
import { SyncProvider } from '../features/sync/sync-context';
import { TransactionsPage } from '../features/transactions/transactions-page';
import { WorkspaceProvider } from '../features/workspaces/workspace-context';
import { AppLayout } from '../layouts/app-layout';

export function AppRoot() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <SyncProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SyncProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { ready, session } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone-400">
        Loading workspace…
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={session ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
