export type ID = string;

export type ViewMode = 'day' | 'week' | 'month' | 'agenda';

export interface Category {
  id: ID;
  name: string;
  color: string;
}

export interface Reminder {
  minutesBefore: number;
}

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  byweekday?: number[];
  count?: number;
  until?: string;
}

export interface CalendarEvent {
  id: ID;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  categoryId?: ID;
  tags?: string[];
  recurrence?: RecurrenceRule;
  recurrenceExceptions?: string[];
  reminders?: Reminder[];
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: ID;
  title: string;
  description?: string;
  weekStart: string;
  done: boolean;
  createdAt: string;
}

export interface Habit {
  id: ID;
  name: string;
  emoji?: string;
  color: string;
  target: number;
  completions: Record<string, boolean>;
  createdAt: string;
}

export type BgTheme = 'aurora' | 'sunset' | 'ocean' | 'lavender' | 'forest' | 'candy' | 'mono';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  accent: string;
  bgTheme: BgTheme;
  weekStartsOn: 0 | 1;
  workDayStart: number;
  workDayEnd: number;
  slotMinutes: 15 | 30 | 60;
  notificationsEnabled: boolean;
  showWeekends: boolean;
  use24HourClock: boolean;
}

export interface PlannerState {
  events: CalendarEvent[];
  categories: Category[];
  goals: Goal[];
  habits: Habit[];
  settings: Settings;
}

export interface EventInstance {
  event: CalendarEvent;
  start: Date;
  end: Date;
  occurrenceKey: string;
}

export interface Workspace {
  ownerId: string;
  ownerEmail?: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface PlannerInvite {
  token: string;
  ownerId: string;
  ownerEmail?: string;
  role: 'editor' | 'viewer';
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

export interface PlannerMember {
  ownerId: string;
  memberId: string;
  ownerEmail?: string;
  memberEmail?: string;
  role: 'editor' | 'viewer';
  createdAt: string;
}
