import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { usePlannerStore } from '../store/plannerStore';
import type {
  CalendarEvent,
  Category,
  Goal,
  Habit,
  PlannerState,
  Settings,
} from '../types';

// ── Tiny observable for sync status ────────────────────────────
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

class Observable<T> {
  value: T;
  private listeners = new Set<(v: T) => void>();
  constructor(initial: T) {
    this.value = initial;
  }
  set(v: T) {
    this.value = v;
    this.listeners.forEach((l) => l(v));
  }
  subscribe(l: (v: T) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const syncStatus = new Observable<SyncStatus>('idle');

// ── Row <-> domain mappers ────────────────────────────────────
function rowToEvent(r: any): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    location: r.location ?? undefined,
    start: r.start,
    end: r.end,
    allDay: r.all_day ?? false,
    categoryId: r.category_id ?? undefined,
    tags: r.tags ?? undefined,
    recurrence: r.recurrence ?? undefined,
    recurrenceExceptions: r.recurrence_exceptions ?? undefined,
    reminders: r.reminders ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function eventToRow(e: CalendarEvent, ownerId: string) {
  return {
    id: e.id,
    user_id: ownerId,
    title: e.title,
    description: e.description ?? null,
    location: e.location ?? null,
    start: e.start,
    end: e.end,
    all_day: !!e.allDay,
    category_id: e.categoryId ?? null,
    tags: e.tags ?? null,
    recurrence: e.recurrence ?? null,
    recurrence_exceptions: e.recurrenceExceptions ?? null,
    reminders: e.reminders ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
function rowToCategory(r: any): Category {
  return { id: r.id, name: r.name, color: r.color };
}
function categoryToRow(c: Category, ownerId: string) {
  return { id: c.id, user_id: ownerId, name: c.name, color: c.color, updated_at: new Date().toISOString() };
}
function rowToGoal(r: any): Goal {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    weekStart: r.week_start,
    done: r.done,
    createdAt: r.created_at,
  };
}
function goalToRow(g: Goal, ownerId: string) {
  return {
    id: g.id,
    user_id: ownerId,
    title: g.title,
    description: g.description ?? null,
    week_start: g.weekStart,
    done: g.done,
    created_at: g.createdAt,
    updated_at: new Date().toISOString(),
  };
}
function rowToHabit(r: any): Habit {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji ?? undefined,
    color: r.color,
    target: r.target,
    completions: r.completions ?? {},
    createdAt: r.created_at,
  };
}
function habitToRow(h: Habit, ownerId: string) {
  return {
    id: h.id,
    user_id: ownerId,
    name: h.name,
    emoji: h.emoji ?? null,
    color: h.color,
    target: h.target,
    completions: h.completions,
    created_at: h.createdAt,
    updated_at: new Date().toISOString(),
  };
}

// ── Loop guard + state ────────────────────────────────────────
let isApplyingRemote = false;
let ownerId: string | null = null;
let selfId: string | null = null;
let storeUnsubscribe: (() => void) | null = null;
let channel: RealtimeChannel | null = null;
let last: PlannerState | null = null;
let pushTimer: number | null = null;

function pickSnap(): PlannerState {
  const s = usePlannerStore.getState();
  return {
    events: s.events,
    categories: s.categories,
    goals: s.goals,
    habits: s.habits,
    settings: s.settings,
  };
}

// ── Diff helpers ──────────────────────────────────────────────
function indexById<T extends { id: string }>(arr: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
}
function diffById<T extends { id: string; updatedAt?: string }>(
  prev: T[],
  cur: T[],
): { upserts: T[]; deletes: string[] } {
  const prevMap = indexById(prev);
  const curMap = indexById(cur);
  const upserts: T[] = [];
  const deletes: string[] = [];
  for (const [id, c] of curMap) {
    const p = prevMap.get(id);
    if (!p || (p.updatedAt && c.updatedAt && p.updatedAt !== c.updatedAt) || p !== c) {
      // Shallow check — Zustand creates new refs on mutation, so identity != fine
      if (!p || JSON.stringify(p) !== JSON.stringify(c)) upserts.push(c);
    }
  }
  for (const id of prevMap.keys()) if (!curMap.has(id)) deletes.push(id);
  return { upserts, deletes };
}

// ── Push pipeline (debounced) ─────────────────────────────────
function schedulePush() {
  if (!supabase || !ownerId || isApplyingRemote) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(pushNow, 400);
}

async function pushNow() {
  if (!supabase || !ownerId) return;
  const cur = pickSnap();
  if (!last) {
    last = cur;
    return;
  }
  syncStatus.set('syncing');
  try {
    const evDiff = diffById(last.events, cur.events);
    const catDiff = diffById(last.categories, cur.categories);
    const goalDiff = diffById(last.goals, cur.goals);
    const habDiff = diffById(last.habits, cur.habits);

    const ops: PromiseLike<unknown>[] = [];
    if (evDiff.upserts.length)
      ops.push(supabase.from('events').upsert(evDiff.upserts.map((e) => eventToRow(e, ownerId!))));
    if (evDiff.deletes.length)
      ops.push(supabase.from('events').delete().in('id', evDiff.deletes));
    if (catDiff.upserts.length)
      ops.push(supabase.from('categories').upsert(catDiff.upserts.map((c) => categoryToRow(c, ownerId!))));
    if (catDiff.deletes.length)
      ops.push(supabase.from('categories').delete().in('id', catDiff.deletes));
    if (goalDiff.upserts.length)
      ops.push(supabase.from('goals').upsert(goalDiff.upserts.map((g) => goalToRow(g, ownerId!))));
    if (goalDiff.deletes.length)
      ops.push(supabase.from('goals').delete().in('id', goalDiff.deletes));
    if (habDiff.upserts.length)
      ops.push(supabase.from('habits').upsert(habDiff.upserts.map((h) => habitToRow(h, ownerId!))));
    if (habDiff.deletes.length)
      ops.push(supabase.from('habits').delete().in('id', habDiff.deletes));

    if (JSON.stringify(last.settings) !== JSON.stringify(cur.settings)) {
      ops.push(
        supabase.from('user_settings').upsert({
          user_id: ownerId,
          data: cur.settings,
          updated_at: new Date().toISOString(),
        }),
      );
    }

    const results = (await Promise.all(ops)) as Array<{ error?: { message: string } } | unknown>;
    const errResult = results.find((r) => (r as any)?.error) as { error?: { message: string } } | undefined;
    if (errResult?.error) throw errResult.error;
    last = cur;
    syncStatus.set('synced');
  } catch (e) {
    console.error('Sync push failed', e);
    syncStatus.set(navigator.onLine ? 'error' : 'offline');
  }
}

// ── Pull / merge ──────────────────────────────────────────────
async function pullFromCloud() {
  if (!supabase || !ownerId) return;
  syncStatus.set('syncing');
  try {
    const [events, categories, goals, habits, settings] = await Promise.all([
      supabase.from('events').select('*').eq('user_id', ownerId),
      supabase.from('categories').select('*').eq('user_id', ownerId),
      supabase.from('goals').select('*').eq('user_id', ownerId),
      supabase.from('habits').select('*').eq('user_id', ownerId),
      supabase.from('user_settings').select('*').eq('user_id', ownerId).maybeSingle(),
    ]);
    if (events.error) throw events.error;
    if (categories.error) throw categories.error;
    if (goals.error) throw goals.error;
    if (habits.error) throw habits.error;

    const local = pickSnap();
    const apply = usePlannerStore.getState()._applyRemote;

    isApplyingRemote = true;
    apply((snap) => mergeIntoLocal(snap, {
      events: (events.data ?? []).map(rowToEvent),
      categories: (categories.data ?? []).map(rowToCategory),
      goals: (goals.data ?? []).map(rowToGoal),
      habits: (habits.data ?? []).map(rowToHabit),
      settings: settings.data?.data as Settings | undefined,
    }));
    isApplyingRemote = false;
    last = pickSnap();

    // After merge, push anything local-newer or local-only to cloud
    last = local; // pretend we never had cloud
    await pushNow();
    syncStatus.set('synced');
  } catch (e) {
    console.error('Sync pull failed', e);
    syncStatus.set(navigator.onLine ? 'error' : 'offline');
  }
}

interface CloudData {
  events: CalendarEvent[];
  categories: Category[];
  goals: Goal[];
  habits: Habit[];
  settings?: Settings;
}
function mergeIntoLocal(local: PlannerState, cloud: CloudData): PlannerState {
  const pickNewer = <T extends { id: string; updatedAt?: string; createdAt?: string }>(
    a: T[],
    b: T[],
  ): T[] => {
    const map = new Map<string, T>();
    for (const x of a) map.set(x.id, x);
    for (const x of b) {
      const cur = map.get(x.id);
      if (!cur) map.set(x.id, x);
      else {
        const aTs = cur.updatedAt || cur.createdAt || '';
        const bTs = x.updatedAt || x.createdAt || '';
        map.set(x.id, bTs > aTs ? x : cur);
      }
    }
    return Array.from(map.values());
  };
  return {
    ...local,
    events: pickNewer(local.events, cloud.events),
    categories: pickNewer(local.categories, cloud.categories),
    goals: pickNewer(local.goals, cloud.goals),
    habits: pickNewer(local.habits, cloud.habits),
    settings: cloud.settings ?? local.settings,
  };
}

// ── Realtime subscription ─────────────────────────────────────
function applySingleRow(table: string, op: 'INSERT' | 'UPDATE' | 'DELETE', row: any) {
  const apply = usePlannerStore.getState()._applyRemote;
  isApplyingRemote = true;
  apply((snap) => {
    if (op === 'DELETE') {
      if (table === 'events') return { ...snap, events: snap.events.filter((e) => e.id !== row.id) };
      if (table === 'categories') return { ...snap, categories: snap.categories.filter((c) => c.id !== row.id) };
      if (table === 'goals') return { ...snap, goals: snap.goals.filter((g) => g.id !== row.id) };
      if (table === 'habits') return { ...snap, habits: snap.habits.filter((h) => h.id !== row.id) };
      return snap;
    }
    if (table === 'events') {
      const e = rowToEvent(row);
      const idx = snap.events.findIndex((x) => x.id === e.id);
      const events = idx >= 0 ? snap.events.map((x) => (x.id === e.id ? (x.updatedAt > e.updatedAt ? x : e) : x)) : [...snap.events, e];
      return { ...snap, events };
    }
    if (table === 'categories') {
      const c = rowToCategory(row);
      const idx = snap.categories.findIndex((x) => x.id === c.id);
      const categories = idx >= 0 ? snap.categories.map((x) => (x.id === c.id ? c : x)) : [...snap.categories, c];
      return { ...snap, categories };
    }
    if (table === 'goals') {
      const g = rowToGoal(row);
      const idx = snap.goals.findIndex((x) => x.id === g.id);
      const goals = idx >= 0 ? snap.goals.map((x) => (x.id === g.id ? g : x)) : [...snap.goals, g];
      return { ...snap, goals };
    }
    if (table === 'habits') {
      const h = rowToHabit(row);
      const idx = snap.habits.findIndex((x) => x.id === h.id);
      const habits = idx >= 0 ? snap.habits.map((x) => (x.id === h.id ? h : x)) : [...snap.habits, h];
      return { ...snap, habits };
    }
    if (table === 'user_settings' && row?.data) {
      return { ...snap, settings: row.data as Settings };
    }
    return snap;
  });
  isApplyingRemote = false;
  last = pickSnap();
}

function subscribeRealtime() {
  if (!supabase || !ownerId) return;
  channel?.unsubscribe();
  channel = supabase
    .channel(`planner-${ownerId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${ownerId}` }, (payload) =>
      applySingleRow('events', payload.eventType as any, payload.new ?? payload.old),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${ownerId}` }, (payload) =>
      applySingleRow('categories', payload.eventType as any, payload.new ?? payload.old),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${ownerId}` }, (payload) =>
      applySingleRow('goals', payload.eventType as any, payload.new ?? payload.old),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${ownerId}` }, (payload) =>
      applySingleRow('habits', payload.eventType as any, payload.new ?? payload.old),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${ownerId}` }, (payload) =>
      applySingleRow('user_settings', payload.eventType as any, payload.new ?? payload.old),
    )
    .subscribe();
}

// ── Public API ────────────────────────────────────────────────
export async function startSync(self: string, owner?: string | null) {
  if (!supabase) return;
  selfId = self;
  ownerId = owner ?? self;
  last = pickSnap();
  storeUnsubscribe?.();
  storeUnsubscribe = usePlannerStore.subscribe((state, prev) => {
    if (isApplyingRemote) return;
    // Only react to data changes, not UI state
    if (
      state.events === prev.events &&
      state.categories === prev.categories &&
      state.goals === prev.goals &&
      state.habits === prev.habits &&
      state.settings === prev.settings
    ) return;
    schedulePush();
  });
  subscribeRealtime();
  await pullFromCloud();
  setupOnlineWatcher();
}

export function stopSync() {
  ownerId = null;
  selfId = null;
  storeUnsubscribe?.();
  storeUnsubscribe = null;
  channel?.unsubscribe();
  channel = null;
  last = null;
  syncStatus.set('idle');
}

export async function switchOwner(newOwnerId: string) {
  if (!selfId) return;
  // The store handles dataset swap (saves current under old key, loads new key).
  usePlannerStore.getState().setActiveOwner(newOwnerId);
  ownerId = newOwnerId;
  last = pickSnap();
  channel?.unsubscribe();
  subscribeRealtime();
  await pullFromCloud();
}

export function triggerFullSync() {
  if (!ownerId) return;
  pullFromCloud();
}

function setupOnlineWatcher() {
  const handleOnline = () => {
    if (ownerId) {
      syncStatus.set('syncing');
      pushNow();
    }
  };
  const handleOffline = () => syncStatus.set('offline');
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}
