import {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
};

export function toISO(d: Date): string {
  return d.toISOString();
}

export function fromISO(s: string): Date {
  return parseISO(s);
}

export function setTime(d: Date, hours: number, minutes: number): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(d, hours), minutes), 0), 0);
}

export function getWeekDays(reference: Date, weekStartsOn: 0 | 1): Date[] {
  const start = startOfWeek(reference, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthGrid(reference: Date, weekStartsOn: 0 | 1): Date[] {
  const monthStart = startOfMonth(reference);
  const monthEnd = endOfMonth(reference);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days: Date[] = [];
  let cur = gridStart;
  while (!isAfter(cur, gridEnd)) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export function formatTime(d: Date, use24h: boolean): string {
  return format(d, use24h ? 'HH:mm' : 'h:mm a');
}

export function formatDay(d: Date): string {
  return format(d, 'EEE d');
}

export function formatHeaderRange(view: 'day' | 'week' | 'month' | 'agenda', d: Date, weekStartsOn: 0 | 1): string {
  if (view === 'day') return format(d, 'EEEE, MMMM d, yyyy');
  if (view === 'month' || view === 'agenda') return format(d, 'MMMM yyyy');
  const start = startOfWeek(d, { weekStartsOn });
  const end = endOfWeek(d, { weekStartsOn });
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

export function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function clampToDay(d: Date, ref: Date): Date {
  if (isBefore(d, startOfDay(ref))) return startOfDay(ref);
  if (isAfter(d, endOfDay(ref))) return endOfDay(ref);
  return d;
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function snap(minutes: number, slot: number): number {
  return Math.round(minutes / slot) * slot;
}
