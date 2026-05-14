import ICAL from 'ical.js';
import { nanoid } from 'nanoid';
import type { CalendarEvent, RecurrenceRule } from '../types';
import { toISO } from './dates';

const FREQ_REVERSE: Record<string, RecurrenceRule['freq']> = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
};

const DAY_TO_NUM: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };
const NUM_TO_DAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function exportICS(events: CalendarEvent[]): string {
  const cal = new ICAL.Component(['vcalendar', [], []]);
  cal.updatePropertyWithValue('prodid', '-//Weekly Planner//EN');
  cal.updatePropertyWithValue('version', '2.0');

  for (const ev of events) {
    const v = new ICAL.Component('vevent');
    v.updatePropertyWithValue('uid', ev.id);
    v.updatePropertyWithValue('summary', ev.title);
    if (ev.description) v.updatePropertyWithValue('description', ev.description);
    if (ev.location) v.updatePropertyWithValue('location', ev.location);
    v.updatePropertyWithValue('dtstart', ICAL.Time.fromJSDate(new Date(ev.start), false));
    v.updatePropertyWithValue('dtend', ICAL.Time.fromJSDate(new Date(ev.end), false));
    v.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(ev.createdAt), false));
    if (ev.recurrence) {
      const parts: string[] = [`FREQ=${ev.recurrence.freq}`];
      if (ev.recurrence.interval && ev.recurrence.interval > 1) parts.push(`INTERVAL=${ev.recurrence.interval}`);
      if (ev.recurrence.count) parts.push(`COUNT=${ev.recurrence.count}`);
      if (ev.recurrence.until) {
        const u = ICAL.Time.fromJSDate(new Date(ev.recurrence.until), true);
        parts.push(`UNTIL=${u.toICALString()}`);
      }
      if (ev.recurrence.byweekday && ev.recurrence.byweekday.length) {
        parts.push(`BYDAY=${ev.recurrence.byweekday.map((d) => NUM_TO_DAY[d]).join(',')}`);
      }
      v.updatePropertyWithValue('rrule', ICAL.Recur.fromString(parts.join(';')));
    }
    cal.addSubcomponent(v);
  }
  return cal.toString();
}

export function importICS(text: string): CalendarEvent[] {
  const jcal = ICAL.parse(text);
  const cal = new ICAL.Component(jcal);
  const vevents = cal.getAllSubcomponents('vevent');
  const out: CalendarEvent[] = [];

  for (const vev of vevents) {
    const e = new ICAL.Event(vev);
    const start = e.startDate.toJSDate();
    const end = e.endDate.toJSDate();
    let recurrence: RecurrenceRule | undefined;
    const rrule = vev.getFirstPropertyValue('rrule') as ICAL.Recur | null;
    if (rrule) {
      const freq = FREQ_REVERSE[rrule.freq];
      if (freq) {
        const byday = (rrule as any).parts?.BYDAY as string[] | undefined;
        recurrence = {
          freq,
          interval: rrule.interval > 1 ? rrule.interval : undefined,
          count: rrule.count || undefined,
          until: rrule.until ? toISO(rrule.until.toJSDate()) : undefined,
          byweekday: byday?.map((d) => DAY_TO_NUM[d.replace(/^[+-]?\d*/, '')]).filter((n) => n !== undefined),
        };
      }
    }
    const now = new Date().toISOString();
    out.push({
      id: e.uid || nanoid(),
      title: e.summary || 'Untitled',
      description: e.description || undefined,
      location: e.location || undefined,
      start: toISO(start),
      end: toISO(end),
      recurrence,
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

export function downloadICS(events: CalendarEvent[], filename = 'planner.ics'): void {
  const text = exportICS(events);
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
