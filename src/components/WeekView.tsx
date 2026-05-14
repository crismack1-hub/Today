import { useMemo, useRef, useState, useEffect } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core';
import { usePlannerStore, selectFilteredEvents } from '../store/plannerStore';
import { expandAll } from '../lib/recurrence';
import {
  differenceInMinutes,
  endOfDay,
  formatTime,
  getWeekDays,
  isSameDay,
  startOfDay,
  toISO,
  snap,
  minutesSinceMidnight,
  rangesOverlap,
  format,
} from '../lib/dates';
import type { EventInstance } from '../types';
import clsx from 'clsx';

const HOUR_HEIGHT = 56;
const PX_PER_MIN = HOUR_HEIGHT / 60;

function categoryColor(catId: string | undefined, categories: { id: string; color: string }[]): string {
  return categories.find((c) => c.id === catId)?.color || '#64748b';
}

interface Props {
  referenceDate: Date;
  singleDay?: boolean;
}

export function WeekView({ referenceDate, singleDay = false }: Props) {
  const s = usePlannerStore();
  const filtered = usePlannerStore(selectFilteredEvents);
  const days = singleDay ? [startOfDay(referenceDate)] : getWeekDays(referenceDate, s.settings.weekStartsOn);
  const showWeekends = s.settings.showWeekends;
  const visibleDays = singleDay ? days : showWeekends ? days : days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
  const slot = s.settings.slotMinutes;

  const rangeStart = startOfDay(visibleDays[0]);
  const rangeEnd = endOfDay(visibleDays[visibleDays.length - 1]);

  const instances = useMemo(
    () => expandAll(filtered, rangeStart, rangeEnd),
    [filtered, rangeStart.getTime(), rangeEnd.getTime()],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );
  const [draggedInstance, setDraggedInstance] = useState<EventInstance | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-scroll to morning on mount
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (s.settings.workDayStart - 1) * HOUR_HEIGHT;
    }
  }, [s.settings.workDayStart]);

  const onDragEnd = (e: DragEndEvent) => {
    setDraggedInstance(null);
    const inst = e.active.data.current?.instance as EventInstance | undefined;
    const over = e.over?.data.current as { day: Date } | undefined;
    if (!inst || !over) return;
    const deltaY = e.delta.y;
    const deltaMin = snap(deltaY / PX_PER_MIN, slot);
    const newStart = new Date(over.day);
    newStart.setHours(inst.start.getHours(), inst.start.getMinutes(), 0, 0);
    newStart.setTime(newStart.getTime() + deltaMin * 60_000);
    const duration = inst.end.getTime() - inst.start.getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    s.updateEvent(inst.event.id, { start: toISO(newStart), end: toISO(newEnd) });
  };

  const allDayEvents = instances.filter((i) => i.event.allDay);
  const timedEvents = instances.filter((i) => !i.event.allDay);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDraggedInstance(e.active.data.current?.instance || null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggedInstance(null)}
    >
      <div className="flex h-full flex-col">
        {/* Day headers */}
        <div className="glass flex border-b border-[color:var(--border)] z-10">
          <div className="w-10 sm:w-16 shrink-0" />
          {visibleDays.map((d) => {
            const isToday = isSameDay(d, now);
            return (
              <div
                key={d.toISOString()}
                className="flex-1 px-2 py-2.5 text-center cursor-pointer transition-colors hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04]"
                onClick={() => {
                  s.setCurrentDate(d);
                  if (!singleDay) s.setView('day');
                }}
              >
                <div
                  className={clsx(
                    'text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em]',
                    isToday ? '' : 'text-slate-500 dark:text-slate-400',
                  )}
                  style={isToday ? { color: 'var(--accent)' } : undefined}
                >
                  {format(d, 'EEE')}
                </div>
                <div
                  className={clsx(
                    'mx-auto mt-0.5 inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-sm font-bold transition-all',
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
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        {allDayEvents.length > 0 && (
          <div className="flex border-b border-[color:var(--border)] bg-slate-100/40 dark:bg-white/[0.02]">
            <div className="w-10 sm:w-16 shrink-0 py-1.5 px-2 text-right text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              All day
            </div>
            {visibleDays.map((d) => (
              <div key={d.toISOString()} className="flex-1 min-h-[28px] py-1 px-1 space-y-1 border-l border-[color:var(--border)]">
                {allDayEvents
                  .filter((i) => isSameDay(i.start, d))
                  .map((i) => {
                    const color = categoryColor(i.event.categoryId, s.categories);
                    return (
                      <div
                        key={i.occurrenceKey}
                        onClick={() => s.openEventModal(i.event.id)}
                        className="cursor-pointer truncate rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.01]"
                        style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, #000 0%))` }}
                      >
                        {i.event.title}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto calendar-scroll">
          <div className="flex relative" style={{ height: 24 * HOUR_HEIGHT }}>
            <TimeColumn use24h={s.settings.use24HourClock} />
            {visibleDays.map((d) => (
              <DayColumn
                key={d.toISOString()}
                day={d}
                instances={timedEvents.filter((i) => isSameDay(i.start, d))}
                slot={slot}
                now={now}
                use24h={s.settings.use24HourClock}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggedInstance && (
          <div
            className="dnd-overlay-event rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${categoryColor(draggedInstance.event.categoryId, s.categories)}, color-mix(in srgb, ${categoryColor(draggedInstance.event.categoryId, s.categories)} 70%, #000))`,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {draggedInstance.event.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function TimeColumn({ use24h }: { use24h: boolean }) {
  return (
    <div className="w-10 sm:w-16 shrink-0 relative">
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          className="relative border-t border-slate-200 dark:border-slate-800 pr-1 sm:pr-2 text-right text-[9px] sm:text-[10px] text-slate-400"
          style={{ height: HOUR_HEIGHT }}
        >
          {h > 0 && (
            <span className="absolute right-1 -top-1.5 whitespace-nowrap">
              <span className="sm:hidden">
                {use24h ? String(h).padStart(2, '0') : `${((h + 11) % 12) + 1}${h < 12 ? 'a' : 'p'}`}
              </span>
              <span className="hidden sm:inline">
                {use24h ? `${String(h).padStart(2, '0')}:00` : `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`}
              </span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

interface DayColumnProps {
  day: Date;
  instances: EventInstance[];
  slot: number;
  now: Date;
  use24h: boolean;
}

function DayColumn({ day, instances, slot, now, use24h }: DayColumnProps) {
  const s = usePlannerStore();
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.toISOString()}`, data: { day } });
  const colRef = useRef<HTMLDivElement | null>(null);
  const isToday = isSameDay(day, now);
  const nowOffset = isToday ? minutesSinceMidnight(now) * PX_PER_MIN : null;

  const layouts = useMemo(() => layoutEvents(instances), [instances]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.bg) return;
    const rect = colRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    let minutes = snap(y / PX_PER_MIN, slot);
    minutes = Math.max(0, Math.min(24 * 60 - slot, minutes));
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(minutes);
    const end = new Date(start.getTime() + 60 * 60_000);
    const id = s.addEvent({ title: 'New event', start: toISO(start), end: toISO(end), categoryId: s.categories[0]?.id });
    s.openEventModal(id);
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        colRef.current = el;
      }}
      data-bg="1"
      onClick={handleClick}
      className={clsx(
        'flex-1 relative border-l border-[color:var(--border)] cursor-cell transition-colors',
        isToday && 'bg-[color:var(--accent-soft)]',
        isOver && 'bg-[color:var(--accent-subtle)]',
      )}
    >
      {/* hour lines */}
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          data-bg="1"
          className="border-t border-slate-900/[0.04] dark:border-white/[0.04]"
          style={{ height: HOUR_HEIGHT }}
        />
      ))}
      {nowOffset !== null && <div className="now-line" style={{ top: nowOffset }} />}
      {layouts.map(({ inst, col, cols }) => (
        <EventBlock key={inst.occurrenceKey} instance={inst} col={col} cols={cols} use24h={use24h} />
      ))}
    </div>
  );
}

interface LayoutItem {
  inst: EventInstance;
  col: number;
  cols: number;
}

function layoutEvents(events: EventInstance[]): LayoutItem[] {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const items: LayoutItem[] = sorted.map((inst) => ({ inst, col: 0, cols: 1 }));
  const clusters: LayoutItem[][] = [];
  let current: LayoutItem[] = [];
  let clusterEnd = -Infinity;
  for (const it of items) {
    if (it.inst.start.getTime() >= clusterEnd && current.length) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(it);
    clusterEnd = Math.max(clusterEnd, it.inst.end.getTime());
  }
  if (current.length) clusters.push(current);

  for (const cluster of clusters) {
    const columns: LayoutItem[][] = [];
    for (const it of cluster) {
      let placed = false;
      for (let ci = 0; ci < columns.length; ci++) {
        const last = columns[ci][columns[ci].length - 1];
        if (!rangesOverlap(last.inst.start, last.inst.end, it.inst.start, it.inst.end)) {
          it.col = ci;
          columns[ci].push(it);
          placed = true;
          break;
        }
      }
      if (!placed) {
        it.col = columns.length;
        columns.push([it]);
      }
    }
    const total = columns.length;
    for (const it of cluster) it.cols = total;
  }
  return items;
}

interface BlockProps {
  instance: EventInstance;
  col: number;
  cols: number;
  use24h: boolean;
}

function EventBlock({ instance, col, cols, use24h }: BlockProps) {
  const s = usePlannerStore();
  const startMin = minutesSinceMidnight(instance.start);
  const dur = Math.max(15, differenceInMinutes(instance.end, instance.start));
  const top = startMin * PX_PER_MIN;
  const height = dur * PX_PER_MIN;
  const widthPct = 100 / cols;
  const leftPct = col * widthPct;
  const color = s.categories.find((c) => c.id === instance.event.categoryId)?.color || '#64748b';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: instance.occurrenceKey,
    data: { instance },
  });

  // Resize handling (native pointer events on the handle)
  const [resizeDelta, setResizeDelta] = useState(0);
  const onResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startEnd = instance.end.getTime();
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      const dMin = snap(dy / PX_PER_MIN, s.settings.slotMinutes);
      setResizeDelta(dMin);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const dy = ev.clientY - startY;
      const dMin = snap(dy / PX_PER_MIN, s.settings.slotMinutes);
      const newEnd = new Date(startEnd + dMin * 60_000);
      const minEnd = new Date(instance.start.getTime() + 15 * 60_000);
      const finalEnd = newEnd < minEnd ? minEnd : newEnd;
      s.updateEvent(instance.event.id, { end: toISO(finalEnd) });
      setResizeDelta(0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const displayHeight = Math.max(20, height + resizeDelta * PX_PER_MIN);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        s.openEventModal(instance.event.id);
      }}
      className={clsx(
        'event-card absolute select-none overflow-hidden rounded-lg px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-[11px]',
        'backdrop-blur-sm ring-1 ring-inset',
        isDragging && 'opacity-30',
      )}
      style={{
        top,
        height: displayHeight,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`,
        borderLeft: `3px solid ${color}`,
        boxShadow: 'var(--shadow-event)',
        touchAction: 'none',
        // ring color via inline custom property
        ['--tw-ring-color' as any]: `${color}33`,
      }}
    >
      <div className="font-semibold text-slate-900 dark:text-slate-50 truncate leading-tight">{instance.event.title}</div>
      <div className="text-slate-600 dark:text-slate-300 truncate text-[9px] sm:text-[10px] font-medium mt-0.5">
        {formatTime(instance.start, use24h)} – {formatTime(instance.end, use24h)}
        {instance.event.recurrence && ' · ↻'}
        {instance.event.reminders?.length ? ' · 🔔' : ''}
      </div>
      {instance.event.location && (
        <div className="text-slate-600/80 dark:text-slate-300/80 truncate text-[9px] sm:text-[10px] mt-0.5">
          {instance.event.location}
        </div>
      )}
      <div className="resize-handle bottom" onPointerDown={onResizeStart} />
    </div>
  );
}
