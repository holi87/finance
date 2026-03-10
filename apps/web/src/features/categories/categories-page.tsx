import type { Category } from '@finance/shared-types';
import { Button, EmptyState, Input, SectionHeader, Select } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import { createLocalCategory, db, enqueueCreateOperation, refreshPendingCount } from '../../storage/db';
import { getDeviceId } from '../../services/session-store';

export function CategoriesPage() {
  const { activeWorkspaceId } = useWorkspace();
  const categories = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.categories.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as Category[]),
    [activeWorkspaceId],
  ) ?? [];
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'expense' | 'income' | 'both'>('expense');
  const [color, setColor] = useState('#bef264');

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Taxonomy" title="Kategorie" description="Kategorie są izolowane per workspace i wspierają późniejsze budżety oraz raporty." />

      <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
        <form
          className="grid gap-4 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!activeWorkspaceId) {
              return;
            }
            const category = createLocalCategory(activeWorkspaceId, { name, kind, color });
            void db.categories
              .put(category)
              .then(() =>
                enqueueCreateOperation({
                  deviceId: getDeviceId(),
                  workspaceId: activeWorkspaceId,
                  entityType: 'category',
                  entityId: category.id,
                  payload: {
                    name: category.name,
                    kind: category.kind,
                    color: category.color ?? undefined,
                  },
                }),
              )
              .then(() => refreshPendingCount(activeWorkspaceId));
            setName('');
          }}
        >
          <Input label="Nazwa" name="name" value={name} onChange={setName} placeholder="Jedzenie" />
          <Select
            label="Typ"
            name="kind"
            value={kind}
            onChange={(value: string) => setKind(value as typeof kind)}
            options={[
              { label: 'Wydatek', value: 'expense' },
              { label: 'Przychód', value: 'income' },
              { label: 'Obie strony', value: 'both' },
            ]}
          />
          <Input label="Kolor" name="color" value={color} onChange={setColor} placeholder="#bef264" />
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={!name}>
              Dodaj kategorię
            </Button>
          </div>
        </form>
      </section>

      {categories.length === 0 ? (
        <EmptyState title="Brak kategorii" description="Dodaj pierwszą kategorię kosztową lub przychodową." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color ?? '#fff' }} />
                <div>
                  <p className="font-semibold text-white">{category.name}</p>
                  <p className="text-sm text-stone-400">{category.kind}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
