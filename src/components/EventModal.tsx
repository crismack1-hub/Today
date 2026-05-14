import { useEffect, useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { Modal } from './Modal';
import { Trash2, Copy, Bell, ExternalLink } from 'lucide-react';
import { fromISO, toISO, format } from '../lib/dates';
import { describeRecurrence } from '../lib/recurrence';
import type { CalendarEvent, RecurrenceRule } from '../types';
import { requestPermission } from '../lib/notifications';
import { firstUrl } from '../lib/linkify';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toLocalInput(iso: string): string {
  const d = fromISO(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}

export function EventModal() {
  const s = usePlannerStore();
  const open = s.isEventModalOpen;
  const event = s.events.find((e) => e.id === s.selectedEventId);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [tagsRaw, setTagsRaw] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>();
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStart(toLocalInput(event.start));
      setEnd(toLocalInput(event.end));
      setAllDay(!!event.allDay);
      setCategoryId(event.categoryId);
      setTagsRaw((event.tags || []).join(', '));
      setRecurrence(event.recurrence);
      setReminderMinutes((event.reminders || []).map((r) => r.minutesBefore));
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const later = new Date(now.getTime() + 60 * 60_000);
      setTitle('');
      setDescription('');
      setLocation('');
      setStart(toLocalInput(toISO(now)));
      setEnd(toLocalInput(toISO(later)));
      setAllDay(false);
      setCategoryId(s.categories[0]?.id);
      setTagsRaw('');
      setRecurrence(undefined);
      setReminderMinutes([]);
    }
  }, [open, event?.id]);

  const handleSave = () => {
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    const patch: Partial<CalendarEvent> = {
      title: title.trim() || 'Untitled',
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      start: fromLocalInput(start),
      end: fromLocalInput(end),
      allDay,
      categoryId,
      tags: tags.length ? tags : undefined,
      recurrence,
      reminders: reminderMinutes.map((m) => ({ minutesBefore: m })),
    };
    if (event) s.updateEvent(event.id, patch);
    else {
      s.addEvent({
        title: patch.title!,
        description: patch.description,
        location: patch.location,
        start: patch.start!,
        end: patch.end!,
        allDay: patch.allDay,
        categoryId: patch.categoryId,
        tags: patch.tags,
        recurrence: patch.recurrence,
        reminders: patch.reminders,
      });
    }
    s.closeEventModal();
  };

  const handleDelete = () => {
    if (!event) return;
    if (!confirm('Delete this event?')) return;
    s.deleteEvent(event.id);
    s.closeEventModal();
  };

  const handleDuplicate = () => {
    if (!event) return;
    s.duplicateEvent(event.id);
    s.closeEventModal();
  };

  const toggleWeekday = (i: number) => {
    if (!recurrence) return;
    const list = recurrence.byweekday || [];
    const next = list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort();
    setRecurrence({ ...recurrence, byweekday: next.length ? next : undefined });
  };

  const REMINDER_PRESETS = [5, 10, 15, 30, 60, 1440];

  const toggleReminder = async (m: number) => {
    if (reminderMinutes.includes(m)) {
      setReminderMinutes(reminderMinutes.filter((x) => x !== m));
    } else {
      const perm = await requestPermission();
      if (perm === 'granted') {
        if (!s.settings.notificationsEnabled) s.setSettings({ notificationsEnabled: true });
      }
      setReminderMinutes([...reminderMinutes, m].sort((a, b) => a - b));
    }
  };

  const detectedUrl = firstUrl(location) || firstUrl(description);

  return (
    <Modal
      open={open}
      onClose={s.closeEventModal}
      title={event ? 'Edit event' : 'New event'}
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3">
          <div className="flex gap-1">
            {event && (
              <>
                <button className="btn-ghost" onClick={handleDuplicate} title="Duplicate">
                  <Copy size={14} /> <span className="hidden sm:inline">Duplicate</span>
                </button>
                <button className="btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950" onClick={handleDelete}>
                  <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary" onClick={s.closeEventModal}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 px-4 sm:px-5 py-4">
        <div>
          <label className="label">Title</label>
          <input
            autoFocus
            className="input text-base font-medium"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Team standup"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start</label>
            <input
              type="datetime-local"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">End</label>
            <input
              type="datetime-local"
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {s.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className="chip text-white"
                style={{
                  backgroundColor: categoryId === c.id ? c.color : 'transparent',
                  color: categoryId === c.id ? '#fff' : c.color,
                  border: `1px solid ${c.color}`,
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Tags (comma-separated)</label>
          <input
            className="input"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="e.g. focus, urgent"
          />
        </div>

        <div>
          <label className="label">Location</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional — paste a URL to make it clickable" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes, links, agenda…"
          />
        </div>

        {detectedUrl && (
          <a
            href={detectedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            <ExternalLink size={14} />
            <span className="truncate max-w-[24ch] sm:max-w-[40ch]">Open {detectedUrl}</span>
          </a>
        )}

        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={!!recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.checked ? { freq: 'WEEKLY', interval: 1 } : undefined)
                }
              />
              Repeats
            </label>
            {recurrence && (
              <span className="text-xs text-slate-500">{describeRecurrence(recurrence)}</span>
            )}
          </div>
          {recurrence && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span>Every</span>
                <input
                  type="number"
                  min={1}
                  value={recurrence.interval || 1}
                  onChange={(e) => setRecurrence({ ...recurrence, interval: Math.max(1, +e.target.value) })}
                  className="w-16 input py-1"
                />
                <select
                  className="input py-1 w-32"
                  value={recurrence.freq}
                  onChange={(e) => setRecurrence({ ...recurrence, freq: e.target.value as RecurrenceRule['freq'] })}
                >
                  <option value="DAILY">Day(s)</option>
                  <option value="WEEKLY">Week(s)</option>
                  <option value="MONTHLY">Month(s)</option>
                  <option value="YEARLY">Year(s)</option>
                </select>
              </div>
              {recurrence.freq === 'WEEKLY' && (
                <div className="flex gap-1">
                  {WEEKDAYS.map((d, i) => {
                    const active = recurrence.byweekday?.includes(i);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWeekday(i)}
                        className={`h-7 w-7 rounded-full text-xs font-semibold ${
                          active
                            ? 'text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                        style={active ? { backgroundColor: 'var(--accent)' } : undefined}
                      >
                        {d[0]}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span>Ends</span>
                <select
                  className="input py-1 w-32"
                  value={recurrence.count ? 'count' : recurrence.until ? 'until' : 'never'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'never') setRecurrence({ ...recurrence, count: undefined, until: undefined });
                    if (v === 'count') setRecurrence({ ...recurrence, count: 10, until: undefined });
                    if (v === 'until') {
                      const u = new Date();
                      u.setMonth(u.getMonth() + 1);
                      setRecurrence({ ...recurrence, count: undefined, until: u.toISOString() });
                    }
                  }}
                >
                  <option value="never">Never</option>
                  <option value="count">After N times</option>
                  <option value="until">On date</option>
                </select>
                {recurrence.count !== undefined && (
                  <input
                    type="number"
                    min={1}
                    className="w-20 input py-1"
                    value={recurrence.count}
                    onChange={(e) => setRecurrence({ ...recurrence, count: Math.max(1, +e.target.value) })}
                  />
                )}
                {recurrence.until !== undefined && (
                  <input
                    type="date"
                    className="input py-1 w-40"
                    value={format(fromISO(recurrence.until), 'yyyy-MM-dd')}
                    onChange={(e) => setRecurrence({ ...recurrence, until: new Date(e.target.value).toISOString() })}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label flex items-center gap-1"><Bell size={12} /> Reminders</label>
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_PRESETS.map((m) => {
              const active = reminderMinutes.includes(m);
              const label = m >= 1440 ? `${m / 1440}d` : m >= 60 ? `${m / 60}h` : `${m}m`;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleReminder(m)}
                  className="chip"
                  style={{
                    backgroundColor: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#fff' : 'inherit',
                    border: '1px solid currentColor',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
