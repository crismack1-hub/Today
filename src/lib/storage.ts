import type { PlannerState } from '../types';

const PREFIX = 'weekly-planner';
const LEGACY_KEY = `${PREFIX}:v1`;

function keyFor(ownerId?: string | null): string {
  return ownerId ? `${PREFIX}:owner:${ownerId}` : LEGACY_KEY;
}

export function loadState(ownerId?: string | null): PlannerState | null {
  const tryKey = (k: string): PlannerState | null => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      return JSON.parse(raw) as PlannerState;
    } catch (e) {
      console.error('Failed to load state', e);
      return null;
    }
  };
  if (ownerId) {
    const v = tryKey(keyFor(ownerId));
    if (v) return v;
    // First-time owner-keyed read: fall back to legacy key (migrating).
    return tryKey(LEGACY_KEY);
  }
  return tryKey(LEGACY_KEY);
}

export function saveState(state: PlannerState, ownerId?: string | null): void {
  try {
    localStorage.setItem(keyFor(ownerId), JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

export function clearState(ownerId?: string | null): void {
  localStorage.removeItem(keyFor(ownerId));
}

// Tracks the currently active workspace (owner_id) for sync + storage scoping.
const ACTIVE_KEY = `${PREFIX}:active-owner`;

export function readActiveOwner(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}
export function writeActiveOwner(ownerId: string | null): void {
  if (ownerId) localStorage.setItem(ACTIVE_KEY, ownerId);
  else localStorage.removeItem(ACTIVE_KEY);
}
