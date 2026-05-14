import { useMemo } from 'react';
import { usePlannerStore, selectFilteredEvents } from '../store/plannerStore';
import { expandAll } from '../lib/recurrence';
import {
  addDays,
  endOfDay,
  format,
  getMonthGrid,
  isSameDay,
  isSameMonth,
  startOfDay,
} from '../lib/dates';
import clsx from 'clsx';

interface Props {
  referenceDate: Date;
}

export function MonthView({ referenceDate }: Props) {
  const s = usePlannerStore();
  const filtered = usePlannerStore(selectFilteredEvents);
  const days = getMonthGrid(referenceDate, s.settings.weekStartsOn);
  const rangeStart = startOfDay(days[0]);
  const rangeEnd = endOfDay(days[days.length - 1]);
  const instances = useMemo(
    () => expandAll(filtered, rangeStart, rangeEnd),
    [filtered, rangeStart.getTime(), rangeEnd.getTime()],
  );

  const today = new Date();

  const weekdayHeaders = Array.from({ length: 7 }, (_, i) =>
    format(addDays(days[0], i), 'EEE'),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="glass grid grid-cols-7 border-b border-[color:var(--border)]">
        {weekdayHeaders.map((h) => (
          <div key={h} className="py-2 sm:py-2.5 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            <span className="sm:hidden">{h.slice(0, 1)}</span>
            <span className="hidden sm:inline">{h}</span>
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 calendar-scroll overflow-y-auto">
        {days.map((d) => {
          const inMonth = isSameMonth(d, referenceDate);
          const isToday = isSameDay(d, today);
          const dayEvents = instances.filter((i) => isSameDay(i.start, d)).slice(0, 4);
          const overflow = instances.filter((i) => isSameDay(i.start, d)).length - dayEvents.length;
          return (
            <div
              key={d.toISOString()}
              onClick={() => {
                s.setCurrentDate(d);
                s.setView('day');
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const start = new Date(d);
                start.setHours(9, 0, 0, 0);
                const end = new Date(start.getTime() + 60 * 60_000);
                const id = s.addEvent({
                  title: 'New event',
                  start: start.toISOString(),
                  end: end.toISOString(),
                  categoryId: s.categories[0]?.id,
                });
                s.openEventModal(id);
              }}
              className={clsx(
                'border-r border-b border-[color:var(--border)] p-1 sm:p-1.5 cursor-pointer text-xs transition-colors min-h-[64px] sm:min-h-[100px]',
                'hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03]',
                isToday && 'bg-[color:var(--accent-soft)]',
                !inMonth && 'bg-slate-100/40 dark:bg-white/[0.015] text-slate-400 dark:text-slate-600',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl text-[11px] sm:text-xs font-bold transition-all',
                    isToday && 'text-white shadow-sm',
                  )}
                  style={
                    isToday
                      ? {
                          background:
                            'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #ec4899))',
                        }
                      : undefined
                  }
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.map((i) => {
                  const color = s.categories.find((c) => c.id === i.event.categoryId)?.color || '#64748b';
                  return (
                    <div
                      key={i.occurrenceKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        s.openEventModal(i.event.id);
                      }}
                      className="truncate rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-transform hover:scale-[1.01]"
                      style={{
                        background: `linear-gradient(135deg, ${color}26, ${color}14)`,
                        color: color,
                        borderLeft: `2px solid ${color}`,
                      }}
                    >
                      {i.event.title}
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1">
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
