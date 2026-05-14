import { RRule, Frequency, Weekday } from 'rrule';
import type { CalendarEvent, EventInstance, RecurrenceRule } from '../types';
import { fromISO, dayKey } from './dates';

const FREQ_MAP: Record<RecurrenceRule['freq'], Frequency> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

const WEEKDAYS: Weekday[] = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

function toRRule(event: CalendarEvent): RRule | null {
  if (!event.recurrence) return null;
  const start = fromISO(event.start);
  const { freq, interval, byweekday, count, until } = event.recurrence;
  return new RRule({
    freq: FREQ_MAP[freq],
    interval: interval || 1,
    byweekday: byweekday?.map((d) => WEEKDAYS[d]),
    count,
    until: until ? fromISO(until) : undefined,
    dtstart: start,
  });
}

export function expandEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): EventInstance[] {
  const start = fromISO(event.start);
  const end = fromISO(event.end);
  const durMs = end.getTime() - start.getTime();

  if (!event.recurrence) {
    if (end < rangeStart || start > rangeEnd) return [];
    return [{ event, start, end, occurrenceKey: `${event.id}` }];
  }

  const rule = toRRule(event);
  if (!rule) return [];
  const exceptions = new Set(event.recurrenceExceptions || []);
  const instances: EventInstance[] = [];

  const occStart = new Date(rangeStart.getTime() - durMs);
  const occurrences = rule.between(occStart, rangeEnd, true);

  for (const occ of occurrences) {
    const occEnd = new Date(occ.getTime() + durMs);
    if (occEnd < rangeStart) continue;
    const key = dayKey(occ);
    if (exceptions.has(key)) continue;
    instances.push({
      event,
      start: occ,
      end: occEnd,
      occurrenceKey: `${event.id}@${key}`,
    });
  }
  return instances;
}

export function expandAll(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): EventInstance[] {
  return events.flatMap((e) => expandEvent(e, rangeStart, rangeEnd));
}

export function describeRecurrence(rule: RecurrenceRule): string {
  const interval = rule.interval || 1;
  const base = (() => {
    switch (rule.freq) {
      case 'DAILY':
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
      case 'WEEKLY':
        return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      case 'MONTHLY':
        return interval === 1 ? 'Monthly' : `Every ${interval} months`;
      case 'YEARLY':
        return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    }
  })();
  let suffix = '';
  if (rule.count) suffix = `, ${rule.count} times`;
  else if (rule.until) suffix = `, until ${rule.until.slice(0, 10)}`;
  return base + suffix;
}
