import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  CalendarEvent,
  Category,
  Goal,
  Habit,
  PlannerState,
  Settings,
  ViewMode,
  Workspace,
} from '../types';
import { loadState, readActiveOwner, saveState, writeActiveOwner } from '../lib/storage';
import { dayKey, toISO, addDays, setTime } from '../lib/dates';

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: '#6366f1',
  bgTheme: 'aurora',
  weekStartsOn: 1,
  workDayStart: 7,
  workDayEnd: 22,
  slotMinutes: 30,
  notificationsEnabled: false,
  showWeekends: true,
  use24HourClock: false,
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Work', color: '#6366f1' },
  { id: 'personal', name: 'Personal', color: '#10b981' },
  { id: 'health', name: 'Health', color: '#f43f5e' },
  { id: 'learning', name: 'Learning', color: '#f59e0b' },
  { id: 'social', name: 'Social', color: '#8b5cf6' },
];

function seedEvents(): CalendarEvent[] {
  const now = new Date();
  const monday = setTime(addDays(now, -((now.getDay() + 6) % 7)), 9, 0);
  const mk = (offsetDays: number, hour: number, dur: number, title: string, cat: string): CalendarEvent => {
    const s = setTime(addDays(monday, offsetDays), hour, 0);
    const e = setTime(addDays(monday, offsetDays), hour + dur, 0);
    return {
      id: nanoid(),
      title,
      start: toISO(s),
      end: toISO(e),
      categoryId: cat,
      createdAt: toISO(now),
      updatedAt: toISO(now),
    };
  };
  return [
    mk(0, 9, 1, 'Team Standup', 'work'),
    mk(0, 14, 2, 'Deep Work — Roadmap', 'work'),
    mk(1, 7, 1, 'Morning Run', 'health'),
    mk(1, 10, 1, 'Design Review', 'work'),
    mk(2, 18, 1, 'Spanish Class', 'learning'),
    mk(3, 12, 1, 'Lunch with Alex', 'social'),
    mk(4, 16, 1, 'Yoga', 'health'),
  ];
}

function defaultState(): PlannerState {
  return {
    events: seedEvents(),
    categories: DEFAULT_CATEGORIES,
    goals: [],
    habits: [
      { id: nanoid(), name: 'Read', emoji: '📚', color: '#f59e0b', target: 5, completions: {}, createdAt: toISO(new Date()) },
      { id: nanoid(), name: 'Exercise', emoji: '💪', color: '#f43f5e', target: 4, completions: {}, createdAt: toISO(new Date()) },
      { id: nanoid(), name: 'Meditate', emoji: '🧘', color: '#10b981', target: 7, completions: {}, createdAt: toISO(new Date()) },
    ],
    settings: DEFAULT_SETTINGS,
  };
}

interface PlannerStore extends PlannerState {
  // ui state
  view: ViewMode;
  currentDate: string;
  selectedEventId: string | null;
  isEventModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isImportExportOpen: boolean;
  isAuthModalOpen: boolean;
  isShareModalOpen: boolean;
  sidebarOpen: boolean;
  searchQuery: string;
  filteredCategoryIds: string[] | null;

  // workspace state
  activeOwnerId: string | null;
  workspaces: Workspace[];

  // undo/redo
  history: PlannerState[];
  future: PlannerState[];

  // actions — data
  addEvent: (e: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  addOccurrenceException: (id: string, occurrenceDate: Date) => void;
  duplicateEvent: (id: string) => void;

  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;

  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'completions'>) => void;
  toggleHabitDay: (id: string, day: Date) => void;
  deleteHabit: (id: string) => void;

  setSettings: (patch: Partial<Settings>) => void;
  importEvents: (events: CalendarEvent[]) => void;
  resetAll: () => void;

  // actions — ui
  setView: (v: ViewMode) => void;
  setCurrentDate: (d: Date) => void;
  goToToday: () => void;
  navigate: (direction: 1 | -1) => void;
  openEventModal: (eventId?: string | null) => void;
  closeEventModal: () => void;
  toggleCommandPalette: (open?: boolean) => void;
  toggleSettings: (open?: boolean) => void;
  toggleImportExport: (open?: boolean) => void;
  toggleAuthModal: (open?: boolean) => void;
  toggleShareModal: (open?: boolean) => void;
  toggleSidebar: () => void;

  // workspace
  setActiveOwner: (ownerId: string | null) => void;
  setWorkspaces: (ws: Workspace[]) => void;
  swapDataset: (next: PlannerState) => void;

  // remote sync: apply incoming changes without pushing to history
  _applyRemote: (mutator: (snap: PlannerState) => PlannerState) => void;
  setSearchQuery: (q: string) => void;
  toggleCategoryFilter: (id: string) => void;
  clearCategoryFilter: () => void;

  // undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function pickDataSnapshot(s: PlannerStore): PlannerState {
  return {
    events: s.events,
    categories: s.categories,
    goals: s.goals,
    habits: s.habits,
    settings: s.settings,
  };
}

const HISTORY_LIMIT = 50;

export const usePlannerStore = create<PlannerStore>((set, get) => {
  const activeOwnerId = readActiveOwner();
  const initial = loadState(activeOwnerId) || defaultState();

  function commit(mutator: (snap: PlannerState) => PlannerState) {
    const prev = pickDataSnapshot(get());
    const next = mutator(prev);
    const newHistory = [...get().history, prev].slice(-HISTORY_LIMIT);
    set({ ...next, history: newHistory, future: [] });
    saveState(next, get().activeOwnerId);
  }

  return {
    ...initial,
    view: 'week',
    currentDate: toISO(new Date()),
    selectedEventId: null,
    isEventModalOpen: false,
    isCommandPaletteOpen: false,
    isSettingsOpen: false,
    isImportExportOpen: false,
    isAuthModalOpen: false,
    isShareModalOpen: false,
    sidebarOpen: true,
    searchQuery: '',
    filteredCategoryIds: null,
    history: [],
    future: [],
    activeOwnerId,
    workspaces: [],

    addEvent: (e) => {
      const id = nanoid();
      const now = toISO(new Date());
      commit((s) => ({
        ...s,
        events: [...s.events, { ...e, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    updateEvent: (id, patch) => {
      commit((s) => ({
        ...s,
        events: s.events.map((ev) =>
          ev.id === id ? { ...ev, ...patch, updatedAt: toISO(new Date()) } : ev,
        ),
      }));
    },
    deleteEvent: (id) => {
      commit((s) => ({ ...s, events: s.events.filter((ev) => ev.id !== id) }));
    },
    addOccurrenceException: (id, date) => {
      commit((s) => ({
        ...s,
        events: s.events.map((ev) =>
          ev.id === id
            ? { ...ev, recurrenceExceptions: [...(ev.recurrenceExceptions || []), dayKey(date)] }
            : ev,
        ),
      }));
    },
    duplicateEvent: (id) => {
      const orig = get().events.find((e) => e.id === id);
      if (!orig) return;
      const now = toISO(new Date());
      const copy: CalendarEvent = {
        ...orig,
        id: nanoid(),
        title: `${orig.title} (copy)`,
        createdAt: now,
        updatedAt: now,
      };
      commit((s) => ({ ...s, events: [...s.events, copy] }));
    },

    addCategory: (c) => {
      commit((s) => ({ ...s, categories: [...s.categories, { ...c, id: nanoid() }] }));
    },
    updateCategory: (id, patch) => {
      commit((s) => ({
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    deleteCategory: (id) => {
      commit((s) => ({
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
        events: s.events.map((e) => (e.categoryId === id ? { ...e, categoryId: undefined } : e)),
      }));
    },

    addGoal: (g) => {
      commit((s) => ({
        ...s,
        goals: [...s.goals, { ...g, id: nanoid(), createdAt: toISO(new Date()) }],
      }));
    },
    toggleGoal: (id) => {
      commit((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
      }));
    },
    deleteGoal: (id) => {
      commit((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
    },

    addHabit: (h) => {
      commit((s) => ({
        ...s,
        habits: [
          ...s.habits,
          { ...h, id: nanoid(), createdAt: toISO(new Date()), completions: {} },
        ],
      }));
    },
    toggleHabitDay: (id, day) => {
      const k = dayKey(day);
      commit((s) => ({
        ...s,
        habits: s.habits.map((h) =>
          h.id === id ? { ...h, completions: { ...h.completions, [k]: !h.completions[k] } } : h,
        ),
      }));
    },
    deleteHabit: (id) => {
      commit((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
    },

    setSettings: (patch) => {
      commit((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },
    importEvents: (events) => {
      commit((s) => ({ ...s, events: [...s.events, ...events] }));
    },
    resetAll: () => {
      const fresh = defaultState();
      const prev = pickDataSnapshot(get());
      set({ ...fresh, history: [...get().history, prev].slice(-HISTORY_LIMIT), future: [] });
      saveState(fresh, get().activeOwnerId);
    },

    setView: (v) => set({ view: v }),
    setCurrentDate: (d) => set({ currentDate: toISO(d) }),
    goToToday: () => set({ currentDate: toISO(new Date()) }),
    navigate: (direction) => {
      const { view, currentDate } = get();
      const d = new Date(currentDate);
      let step = 1;
      if (view === 'week' || view === 'agenda') step = 7;
      else if (view === 'month') {
        const next = new Date(d);
        next.setMonth(d.getMonth() + direction);
        set({ currentDate: toISO(next) });
        return;
      }
      set({ currentDate: toISO(addDays(d, direction * step)) });
    },
    openEventModal: (eventId = null) => set({ selectedEventId: eventId, isEventModalOpen: true }),
    closeEventModal: () => set({ isEventModalOpen: false, selectedEventId: null }),
    toggleCommandPalette: (open) =>
      set((s) => ({ isCommandPaletteOpen: open ?? !s.isCommandPaletteOpen })),
    toggleSettings: (open) => set((s) => ({ isSettingsOpen: open ?? !s.isSettingsOpen })),
    toggleImportExport: (open) => set((s) => ({ isImportExportOpen: open ?? !s.isImportExportOpen })),
    toggleAuthModal: (open) => set((s) => ({ isAuthModalOpen: open ?? !s.isAuthModalOpen })),
    toggleShareModal: (open) => set((s) => ({ isShareModalOpen: open ?? !s.isShareModalOpen })),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    setActiveOwner: (ownerId) => {
      // Persist the current dataset under its current owner key before swapping.
      const cur = get();
      const curSnap: PlannerState = {
        events: cur.events,
        categories: cur.categories,
        goals: cur.goals,
        habits: cur.habits,
        settings: cur.settings,
      };
      saveState(curSnap, cur.activeOwnerId);
      // Load the target dataset (or empty defaults).
      const next = loadState(ownerId) || defaultState();
      writeActiveOwner(ownerId);
      set({
        ...next,
        activeOwnerId: ownerId,
        history: [],
        future: [],
      });
      saveState(next, ownerId);
    },
    setWorkspaces: (ws) => set({ workspaces: ws }),
    swapDataset: (next) => {
      const ownerId = get().activeOwnerId;
      set({ ...next, history: [], future: [] });
      saveState(next, ownerId);
    },

    _applyRemote: (mutator) => {
      const snap = pickDataSnapshot(get());
      const next = mutator(snap);
      set({ ...next });
      saveState(next, get().activeOwnerId);
    },
    setSearchQuery: (q) => set({ searchQuery: q }),
    toggleCategoryFilter: (id) =>
      set((s) => {
        const cur = s.filteredCategoryIds || [];
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        return { filteredCategoryIds: next.length ? next : null };
      }),
    clearCategoryFilter: () => set({ filteredCategoryIds: null }),

    undo: () => {
      const { history } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      const cur = pickDataSnapshot(get());
      set({
        ...prev,
        history: history.slice(0, -1),
        future: [cur, ...get().future].slice(0, HISTORY_LIMIT),
      });
      saveState(prev, get().activeOwnerId);
    },
    redo: () => {
      const { future } = get();
      if (future.length === 0) return;
      const next = future[0];
      const cur = pickDataSnapshot(get());
      set({
        ...next,
        future: future.slice(1),
        history: [...get().history, cur].slice(-HISTORY_LIMIT),
      });
      saveState(next, get().activeOwnerId);
    },
    canUndo: () => get().history.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

export function selectFilteredEvents(s: PlannerStore): CalendarEvent[] {
  let evs = s.events;
  if (s.filteredCategoryIds && s.filteredCategoryIds.length) {
    evs = evs.filter((e) => e.categoryId && s.filteredCategoryIds!.includes(e.categoryId));
  }
  if (s.searchQuery.trim()) {
    const q = s.searchQuery.toLowerCase();
    evs = evs.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q),
    );
  }
  return evs;
}
