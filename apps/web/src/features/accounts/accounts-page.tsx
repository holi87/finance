import type { Account } from '@finance/shared-types';
import { Button, CurrencyAmount, EmptyState, Input, SectionHeader, Select } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import { createLocalAccount, db, enqueueCreateOperation, refreshPendingCount } from '../../storage/db';
import { getDeviceId } from '../../services/session-store';

export function AccountsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const accounts = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.accounts.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as Account[]),
    [activeWorkspaceId],
  ) ?? [];
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'cash' | 'savings' | 'credit' | 'investment'>('bank');
  const [openingBalance, setOpeningBalance] = useState('0.00');

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Accounts" title="Konta" description="Osobne konta per workspace, z bieżącym balansem lokalnym." />

      <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
        <form
          className="grid gap-4 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!activeWorkspaceId) {
              return;
            }
            const account = createLocalAccount(activeWorkspaceId, {
              name,
              type,
              currency: 'PLN',
              openingBalance,
            });
            void db.accounts
              .put(account)
              .then(() =>
                enqueueCreateOperation({
                  deviceId: getDeviceId(),
                  workspaceId: activeWorkspaceId,
                  entityType: 'account',
                  entityId: account.id,
                  payload: {
                    name: account.name,
                    type: account.type,
                    currency: account.currency,
                    openingBalance: account.openingBalance,
                  },
                }),
              )
              .then(() => refreshPendingCount(activeWorkspaceId));
            setName('');
            setOpeningBalance('0.00');
          }}
        >
          <Input label="Nazwa" name="name" value={name} onChange={setName} placeholder="Konto główne" />
          <Select
            label="Typ"
            name="type"
            value={type}
            onChange={(value: string) => setType(value as typeof type)}
            options={[
              { label: 'Bank', value: 'bank' },
              { label: 'Cash', value: 'cash' },
              { label: 'Savings', value: 'savings' },
              { label: 'Credit', value: 'credit' },
              { label: 'Investment', value: 'investment' },
            ]}
          />
          <Input label="Saldo początkowe" name="openingBalance" value={openingBalance} onChange={setOpeningBalance} />
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={!name}>
              Dodaj konto
            </Button>
          </div>
        </form>
      </section>

      {accounts.length === 0 ? (
        <EmptyState title="Brak kont" description="Dodaj pierwsze konto. Pojawi się od razu lokalnie i trafi do synchronizacji." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{account.name}</p>
                  <p className="text-sm text-stone-400">{account.type}</p>
                </div>
                <CurrencyAmount value={account.currentBalanceCached} currency={account.currency} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
