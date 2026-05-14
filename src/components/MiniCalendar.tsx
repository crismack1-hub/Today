import { usePlannerStore } from '../store/plannerStore';
import {
  addDays,
  fromISO,
  getMonthGrid,
  isSameDay,
  isSameMonth,
  startOfMonth,
  format,
} from '../lib/dates';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export function MiniCalendar() {
  const cur = usePlannerStore((s) => s.currentDate);
  const weekStartsOn = usePlannerStore((s) => s.settings.weekStartsOn);
  const setCurrentDate = usePlannerStore((s) => s.setCurrentDate);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(fromISO(cur)));
  const today = new Date();
  const selected = fromISO(cur);
  const days = getMonthGrid(viewMonth, weekStartsOn);

  const headers = Array.from({ length: 7 }, (_, i) =>
    format(addDays(days[0], i), 'EEEEE'),
  );

  return (
    <div className="px-3">
      <div className="flex items-center justify-between mb-2">
        <button
          className="btn-ghost p-1"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <div className="text-sm font-medium">{format(viewMonth, 'MMMM yyyy')}</div>
        <button
          className="btn-ghost p-1"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-[10px] text-slate-500 dark:text-slate-400 mb-1">
        {headers.map((h, i) => (
          <div key={i} className="text-center">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selected);
          const inMonth = isSameMonth(d, viewMonth);
          return (
            <button
              key={d.toISOString()}
              onClick={() => setCurrentDate(d)}
              className={clsx(
                'mx-auto h-7 w-7 rounded-lg text-xs font-medium transition-all duration-150',
                isSelected && 'text-white shadow-sm',
                !isSelected && isToday && 'font-bold',
                !isSelected && !inMonth && 'text-slate-400 dark:text-slate-600',
                !isSelected && inMonth && 'hover:bg-slate-900/[0.06] dark:hover:bg-white/[0.06]',
              )}
              style={
                isSelected
                  ? { backgroundColor: 'var(--accent)' }
                  : isToday
                  ? { color: 'var(--accent)' }
                  : undefined
              }
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
