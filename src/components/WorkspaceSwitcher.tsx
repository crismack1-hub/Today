import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Share2, Users, Check, LogOut } from 'lucide-react';
import { usePlannerStore } from '../store/plannerStore';
import { useAuth } from '../hooks/useAuth';
import { listWorkspaces, leaveSharedPlanner } from '../lib/share';
import { switchOwner } from '../lib/sync';
import { supabaseEnabled } from '../lib/supabase';
import clsx from 'clsx';

export function WorkspaceSwitcher() {
  const { user } = useAuth();
  const activeOwnerId = usePlannerStore((s) => s.activeOwnerId);
  const workspaces = usePlannerStore((s) => s.workspaces);
  const setWorkspaces = usePlannerStore((s) => s.setWorkspaces);
  const toggleShare = usePlannerStore((s) => s.toggleShareModal);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !supabaseEnabled) return;
    listWorkspaces(user.id, user.email).then(setWorkspaces);
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);

  if (!user || !supabaseEnabled) return null;
  // Only show switcher if there's at least one shared workspace.
  if (workspaces.length <= 1) {
    return null;
  }

  const active = workspaces.find((w) => w.ownerId === (activeOwnerId || user.id)) || workspaces[0];
  const isOwn = active.ownerId === user.id;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary !px-2 !py-1 text-xs gap-1"
        title="Switch planner"
      >
        <Users size={12} />
        <span className="hidden sm:inline max-w-[10ch] truncate">
          {isOwn ? 'My planner' : active.ownerEmail ?? 'Shared'}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-[color:var(--border-strong)] bg-white dark:bg-slate-900 shadow-xl py-1 animate-slide-up overflow-hidden">
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-400">Planners</div>
          {workspaces.map((w) => {
            const isActive = w.ownerId === active.ownerId;
            const isOwnRow = w.ownerId === user.id;
            return (
              <button
                key={w.ownerId}
                onClick={async () => {
                  setOpen(false);
                  if (!isActive) await switchOwner(w.ownerId);
                }}
                className={clsx(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]',
                  isActive && 'bg-[color:var(--accent-subtle)]',
                )}
              >
                <div
                  className="grid h-6 w-6 place-items-center rounded-md text-white text-[10px] font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))' }}
                >
                  {(w.ownerEmail || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {isOwnRow ? 'My planner' : w.ownerEmail || w.ownerId.slice(0, 8)}
                  </div>
                  <div className="text-[10px] text-slate-500">{w.role}</div>
                </div>
                {isActive && <Check size={14} className="text-emerald-500 shrink-0" />}
                {!isOwnRow && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Leave ${w.ownerEmail || 'this planner'}?`)) return;
                      await leaveSharedPlanner(w.ownerId, user.id);
                      setWorkspaces(workspaces.filter((x) => x.ownerId !== w.ownerId));
                      if (isActive) await switchOwner(user.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Leave"
                  >
                    <LogOut size={12} />
                  </button>
                )}
              </button>
            );
          })}
          <div className="my-1 border-t border-[color:var(--border)]" />
          <button
            onClick={() => {
              setOpen(false);
              toggleShare(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
          >
            <Share2 size={14} className="text-slate-400" /> Share my planner…
          </button>
        </div>
      )}
    </div>
  );
}
