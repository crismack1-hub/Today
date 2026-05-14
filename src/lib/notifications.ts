import type { EventInstance } from '../types';

const SHOWN_KEY = 'weekly-planner:notifications-shown';

function getShown(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function setShown(s: Set<string>): void {
  const arr = Array.from(s).slice(-500);
  localStorage.setItem(SHOWN_KEY, JSON.stringify(arr));
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export function notificationsAllowed(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function fireReminders(instances: EventInstance[]): void {
  if (!notificationsAllowed()) return;
  const now = Date.now();
  const shown = getShown();
  let dirty = false;

  for (const inst of instances) {
    const reminders = inst.event.reminders || [];
    for (const r of reminders) {
      const fireAt = inst.start.getTime() - r.minutesBefore * 60_000;
      const key = `${inst.occurrenceKey}:${r.minutesBefore}`;
      if (shown.has(key)) continue;
      if (fireAt <= now && inst.start.getTime() > now) {
        try {
          new Notification(inst.event.title, {
            body: `Starts in ${r.minutesBefore} min`,
            tag: key,
          });
        } catch {
          // Some browsers block constructor in non-secure contexts
        }
        shown.add(key);
        dirty = true;
      }
    }
  }
  if (dirty) setShown(shown);
}
