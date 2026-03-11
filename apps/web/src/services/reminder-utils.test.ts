import { describe, expect, it } from 'vitest';

import { getReminderOccurrenceState, sortRemindersByUrgency } from './reminder-utils';

describe('reminder utils', () => {
  it('marks one-time reminder as due until completed', () => {
    const state = getReminderOccurrenceState(
      {
        scheduleType: 'once',
        dueDate: '2026-03-10',
        dueDayOfMonth: null,
        lastCompletedAt: null,
        isActive: true,
      },
      '2026-03-12',
    );

    expect(state.isDue).toBe(true);
    expect(state.isOverdue).toBe(true);
    expect(state.occurrenceDate).toBe('2026-03-10');
  });

  it('handles monthly reminders with clamped day at month end', () => {
    const state = getReminderOccurrenceState(
      {
        scheduleType: 'monthly',
        dueDate: null,
        dueDayOfMonth: 31,
        lastCompletedAt: null,
        isActive: true,
      },
      '2026-02-28',
    );

    expect(state.isDue).toBe(true);
    expect(state.occurrenceDate).toBe('2026-02-28');
  });

  it('sorts due reminders ahead of future reminders', () => {
    const reminders = sortRemindersByUrgency(
      [
        {
          id: 'future',
          workspaceId: 'ws',
          title: 'Internet',
          notes: null,
          amount: '100.00',
          currency: 'PLN',
          accountId: 'acc',
          categoryId: null,
          scheduleType: 'monthly',
          dueDate: null,
          dueDayOfMonth: 20,
          isActive: true,
          lastCompletedAt: null,
          version: 1,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          deletedAt: null,
        },
        {
          id: 'due',
          workspaceId: 'ws',
          title: 'Czynsz',
          notes: null,
          amount: '1200.00',
          currency: 'PLN',
          accountId: 'acc',
          categoryId: null,
          scheduleType: 'monthly',
          dueDate: null,
          dueDayOfMonth: 5,
          isActive: true,
          lastCompletedAt: null,
          version: 1,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
      '2026-03-10',
    );

    expect(reminders[0]?.id).toBe('due');
  });
});
