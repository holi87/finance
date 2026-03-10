import { Button, Input, Select, Textarea } from '@finance/ui';
import type { Account, Category, Transaction } from '@finance/shared-types';
import { useState } from 'react';

export function TransactionForm({
  accounts,
  categories,
  onSubmit,
}: {
  accounts: Account[];
  categories: Category[];
  onSubmit: (payload: {
    accountId: string;
    categoryId: string | null;
    type: Transaction['type'];
    amount: string;
    currency: string;
    description?: string;
    notes?: string;
    transactionDate: string;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        void onSubmit({
          accountId,
          categoryId: categoryId || null,
          type,
          amount,
          currency: 'PLN',
          description,
          notes,
          transactionDate,
        }).finally(() => {
          setSubmitting(false);
          setAmount('');
          setDescription('');
          setNotes('');
        });
      }}
    >
      <Select
        label="Typ"
        name="type"
        value={type}
        onChange={(value: string) => setType(value as Transaction['type'])}
        options={[
          { label: 'Wydatek', value: 'expense' },
          { label: 'Przychód', value: 'income' },
        ]}
      />
      <Input label="Kwota" name="amount" value={amount} onChange={setAmount} placeholder="0.00" />
      <Select
        label="Konto"
        name="account"
        value={accountId}
        onChange={setAccountId}
        options={accounts.map((account) => ({ label: account.name, value: account.id }))}
      />
      <Select
        label="Kategoria"
        name="category"
        value={categoryId}
        onChange={setCategoryId}
        options={[
          { label: 'Bez kategorii', value: '' },
          ...categories.map((category) => ({ label: category.name, value: category.id })),
        ]}
      />
      <Input label="Data" name="transactionDate" type="date" value={transactionDate} onChange={setTransactionDate} />
      <Input label="Opis" name="description" value={description} onChange={setDescription} placeholder="Zakupy, faktura, lunch…" />
      <div className="md:col-span-2">
        <Textarea label="Notatka" name="notes" value={notes} onChange={setNotes} placeholder="Opcjonalna notatka" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting || !accountId || !amount}>
          {submitting ? 'Zapisywanie…' : 'Dodaj transakcję'}
        </Button>
      </div>
    </form>
  );
}
