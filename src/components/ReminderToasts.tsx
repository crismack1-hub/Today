import { useEffect, useState, useMemo } from 'react';
import { Bell, X } from 'lucide-react';
import { usePlannerStore } from '../store/plannerStore';
import { expandAll } from '../lib/recurrence';
import { addDays, formatTime } from '../lib/dates';

interface FiredKey {
  occurrenceKey: string;
  minutesBefore: number;
}

const STORE_KEY = 'weekly-planner:in-app-reminders-fired';

function readFired(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function writeFired(s: Set<string>): void {
  const arr = Array.from(s).slice(-300);
  localStorage.setItem(STORE_KEY, JSON.stringify(arr));
}

interface ActiveToast {
  id: string;
  title: string;
  start: Date;
  end: Date;
  minutesBefore: number;
  color: string;
  eventId: string;
}

export function ReminderToasts() {
  const events = usePlannerStore((s) => s.events);
  const categories = usePlannerStore((s) => s.categories);
  const use24h = usePlannerStore((s) => s.settings.use24HourClock);
  const openEventModal = usePlannerStore((s) => s.openEventModal);
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const upcomingInstances = useMemo(() => {
    const now = new Date();
    return expandAll(events, now, addDays(now, 1));
  }, [events, tick]);

  useEffect(() => {
    const now = Date.now();
    const fired = readFired();
    const additions: ActiveToast[] = [];
    let dirty = false;

    for (const inst of upcomingInstances) {
      const reminders = inst.event.reminders || [];
      for (const r of reminders) {
        const fireAt = inst.start.getTime() - r.minutesBefore * 60_000;
        const key = `${inst.occurrenceKey}:${r.minutesBefore}`;
        if (fired.has(key)) continue;
        // fire if we're past fireAt but the event hasn't started yet
        if (fireAt <= now && inst.start.getTime() > now) {
          const color = categories.find((c) => c.id === inst.event.categoryId)?.color || '#6366f1';
          additions.push({
            id: key,
            title: inst.event.title,
            start: inst.start,
            end: inst.end,
            minutesBefore: r.minutesBefore,
            color,
            eventId: inst.event.id,
          });
          fired.add(key);
          dirty = true;
        }
      }
    }
    if (additions.length) setToasts((cur) => [...cur, ...additions]);
    if (dirty) writeFired(fired);
  }, [upcomingInstances, categories]);

  const dismiss = (id: string) => setToasts((cur) => cur.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[55] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none">
      {toasts.slice(-3).map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border border-[color:var(--border-strong)] bg-white dark:bg-slate-900 p-3 flex items-center gap-3 animate-slide-up backdrop-blur-md"
          style={{
            boxShadow: 'var(--shadow-lg)',
            background: `linear-gradient(135deg, ${t.color}14 0%, var(--surface) 30%)`,
          }}
        >
          <div
            className="h-10 w-10 shrink-0 grid place-items-center rounded-lg text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${t.color}, color-mix(in srgb, ${t.color} 65%, #000))` }}
          >
            <Bell size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">{t.title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Starts in {t.minutesBefore} min · {formatTime(t.start, use24h)}
            </div>
            <button
              onClick={() => {
                openEventModal(t.eventId);
                dismiss(t.id);
              }}
              className="text-xs font-medium mt-1"
              style={{ color: t.color }}
            >
              View →
            </button>
          </div>
          <button className="btn-ghost p-1" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
