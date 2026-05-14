import { useEffect, useMemo, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import clsx from 'clsx';
import { usePlannerStore } from '../store/plannerStore';
import { expandAll } from '../lib/recurrence';
import { addDays, formatTime, isSameDay } from '../lib/dates';

function describeIn(ms: number): { text: string; tone: 'imminent' | 'soon' | 'later' | 'past' } {
  if (ms < 0) return { text: 'now', tone: 'imminent' };
  const min = Math.round(ms / 60_000);
  if (min < 60) return { text: `in ${min} min`, tone: min <= 15 ? 'imminent' : 'soon' };
  const hr = Math.round(min / 60);
  if (hr < 24) return { text: `in ${hr} hr`, tone: 'soon' };
  const d = Math.round(hr / 24);
  return { text: `in ${d}d`, tone: 'later' };
}

export function UpcomingPanel() {
  const events = usePlannerStore((s) => s.events);
  const use24h = usePlannerStore((s) => s.settings.use24HourClock);
  const openEventModal = usePlannerStore((s) => s.openEventModal);
  const setCurrentDate = usePlannerStore((s) => s.setCurrentDate);
  const setView = usePlannerStore((s) => s.setView);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const instances = useMemo(() => {
    const start = now;
    const end = addDays(now, 14);
    return expandAll(events, start, end)
      .filter((i) => i.start >= start || (i.start <= start && i.end > start))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [events, now]);

  if (instances.length === 0) {
    return (
      <div className="px-4 text-xs text-slate-500 dark:text-slate-400">
        Nothing on the horizon. Tap <kbd>N</kbd> to add an event.
      </div>
    );
  }

  return (
    <ul className="px-2 space-y-1">
      {instances.map((inst) => {
        const color = usePlannerStore.getState().categories.find((c) => c.id === inst.event.categoryId)?.color || '#64748b';
        const live = inst.start <= now && inst.end > now;
        const diff = describeIn(inst.start.getTime() - now.getTime());
        return (
          <li key={inst.occurrenceKey}>
            <button
              onClick={() => {
                setCurrentDate(inst.start);
                setView('day');
                openEventModal(inst.event.id);
              }}
              className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04] text-left transition-colors"
            >
              <span
                className="h-8 w-1 rounded-full shrink-0"
                style={{
                  background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 65%, #000))`,
                  boxShadow: live ? `0 0 10px ${color}aa` : undefined,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate tracking-tight">{inst.event.title}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Clock size={10} />
                  <span>
                    {isSameDay(inst.start, now) ? 'Today' : isSameDay(inst.start, addDays(now, 1)) ? 'Tomorrow' : inst.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {formatTime(inst.start, use24h)}
                  </span>
                  {inst.event.reminders?.length ? <Bell size={9} className="text-amber-500" /> : null}
                </div>
              </div>
              <span
                className={clsx(
                  'chip shrink-0 text-[10px] font-semibold whitespace-nowrap',
                  live
                    ? 'bg-emerald-500 text-white'
                    : diff.tone === 'imminent'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                    : diff.tone === 'soon'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-500/10 text-slate-500',
                )}
              >
                {live ? 'now' : diff.text}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
