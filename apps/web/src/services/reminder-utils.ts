import type { Reminder } from '@finance/shared-types';

export interface ReminderOccurrenceState {
  occurrenceDate: string | null;
  isDue: boolean;
  isOverdue: boolean;
  nextDate: string | null;
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function buildMonthlyDate(year: number, monthIndex: number, dayOfMonth: number) {
  const day = Math.min(dayOfMonth, getDaysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function getReminderOccurrenceState(
  reminder: Pick<
    Reminder,
    'scheduleType' | 'dueDate' | 'dueDayOfMonth' | 'lastCompletedAt' | 'isActive'
  >,
  today: string,
): ReminderOccurrenceState {
  if (!reminder.isActive) {
    return {
      occurrenceDate: null,
      isDue: false,
      isOverdue: false,
      nextDate: null,
    };
  }

  if (reminder.scheduleType === 'once') {
    if (!reminder.dueDate) {
      return {
        occurrenceDate: null,
        isDue: false,
        isOverdue: false,
        nextDate: null,
      };
    }

    const isResolved = reminder.lastCompletedAt === reminder.dueDate;
    const isDue = !isResolved && reminder.dueDate <= today;

    return {
      occurrenceDate: isDue ? reminder.dueDate : null,
      isDue,
      isOverdue: isDue && reminder.dueDate < today,
      nextDate: isResolved ? null : reminder.dueDate,
    };
  }

  if (!reminder.dueDayOfMonth) {
    return {
      occurrenceDate: null,
      isDue: false,
      isOverdue: false,
      nextDate: null,
    };
  }

  const [yearPart, monthPart] = today.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return {
      occurrenceDate: null,
      isDue: false,
      isOverdue: false,
      nextDate: null,
    };
  }

  const currentOccurrence = buildMonthlyDate(
    year,
    month - 1,
    reminder.dueDayOfMonth,
  );

  if (currentOccurrence <= today && reminder.lastCompletedAt !== currentOccurrence) {
    return {
      occurrenceDate: currentOccurrence,
      isDue: true,
      isOverdue: currentOccurrence < today,
      nextDate: currentOccurrence,
    };
  }

  const nextMonthDate = month === 12
    ? buildMonthlyDate(year + 1, 0, reminder.dueDayOfMonth)
    : buildMonthlyDate(year, month, reminder.dueDayOfMonth);

  return {
    occurrenceDate: null,
    isDue: false,
    isOverdue: false,
    nextDate: currentOccurrence > today ? currentOccurrence : nextMonthDate,
  };
}

export function sortRemindersByUrgency(
  reminders: Reminder[],
  today: string,
) {
  return reminders
    .slice()
    .sort((left, right) => {
      const leftState = getReminderOccurrenceState(left, today);
      const rightState = getReminderOccurrenceState(right, today);

      if (leftState.isDue !== rightState.isDue) {
        return leftState.isDue ? -1 : 1;
      }

      const leftDate = leftState.occurrenceDate ?? leftState.nextDate ?? '9999-12-31';
      const rightDate =
        rightState.occurrenceDate ?? rightState.nextDate ?? '9999-12-31';

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      return left.title.localeCompare(right.title);
    });
}
