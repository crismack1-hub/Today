import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { usePlannerStore, selectFilteredEvents } from '../store/plannerStore';
import { expandAll } from '../lib/recurrence';
import { addDays, format, formatTime, isSameDay, startOfDay } from '../lib/dates';
import { firstUrl } from '../lib/linkify';

interface Props {
  referenceDate: Date;
}

export function AgendaView({ referenceDate }: Props) {
  const s = usePlannerStore();
  const filtered = usePlannerStore(selectFilteredEvents);
  const rangeStart = startOfDay(referenceDate);
  const rangeEnd = addDays(rangeStart, 30);
  const instances = useMemo(
    () => expandAll(filtered, rangeStart, rangeEnd).sort((a, b) => a.start.getTime() - b.start.getTime()),
    [filtered, rangeStart.getTime()],
  );

  const grouped = new Map<string, typeof instances>();
  for (const inst of instances) {
    const key = format(inst.start, 'yyyy-MM-dd');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(inst);
  }

  return (
    <div className="h-full overflow-y-auto calendar-scroll px-3 sm:px-6 py-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {grouped.size === 0 && (
          <div className="text-center text-slate-500 py-12">
            No upcoming events in the next 30 days.
          </div>
        )}
        {Array.from(grouped.entries()).map(([key, list]) => {
          const d = new Date(key);
          const isToday = isSameDay(d, new Date());
          return (
            <section key={key}>
              <div className="glass sticky top-0 z-10 py-3 mb-3 -mx-3 sm:-mx-6 px-3 sm:px-6 flex items-baseline gap-3 border-b border-[color:var(--border)]">
                <span
                  className={`text-3xl font-bold tabular-nums tracking-tight ${isToday ? '' : 'text-slate-900 dark:text-slate-100'}`}
                  style={isToday ? { color: 'var(--accent)' } : undefined}
                >
                  {format(d, 'd')}
                </span>
                <div>
                  <div className="text-sm font-semibold tracking-tight">{format(d, 'EEEE')}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {format(d, 'MMM yyyy')}
                    {isToday && (
                      <span
                        className="ml-1.5 chip"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        Today
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {list.map((i) => {
                  const color = s.categories.find((c) => c.id === i.event.categoryId)?.color || '#64748b';
                  const url = firstUrl(i.event.location) || firstUrl(i.event.description);
                  return (
                    <li
                      key={i.occurrenceKey}
                      onClick={() => s.openEventModal(i.event.id)}
                      className="card group flex items-center gap-3 cursor-pointer p-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${color}08 0%, transparent 30%)`,
                      }}
                    >
                      <span
                        className="h-10 w-1.5 rounded-full shrink-0"
                        style={{
                          background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 70%, #000))`,
                          boxShadow: `0 0 12px ${color}66`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate tracking-tight">{i.event.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {i.event.allDay
                            ? 'All day'
                            : `${formatTime(i.start, s.settings.use24HourClock)} – ${formatTime(i.end, s.settings.use24HourClock)}`}
                          {i.event.location && ` · ${i.event.location}`}
                          {i.event.recurrence && ' · ↻'}
                        </div>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                          style={{ color: 'var(--accent)' }}
                          title={url}
                          aria-label={`Open link for ${i.event.title}`}
                        >
                          <ExternalLink size={12} />
                          <span className="hidden sm:inline">Open</span>
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
