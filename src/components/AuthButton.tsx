import { Cloud, CloudOff, LogIn, LogOut, User as UserIcon, RefreshCw, Share2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { usePlannerStore } from '../store/plannerStore';
import { syncStatus, triggerFullSync } from '../lib/sync';

export function AuthButton() {
  const { user, enabled } = useAuth();
  const toggleAuthModal = usePlannerStore((s) => s.toggleAuthModal);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(syncStatus.value);

  useEffect(() => {
    const unsub = syncStatus.subscribe(setStatus);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  if (!enabled) {
    return (
      <button
        className="btn-ghost p-1.5"
        title="Cloud sync — not configured"
        aria-label="Cloud sync status"
        onClick={() => toggleAuthModal(true)}
      >
        <CloudOff size={16} className="text-slate-400" />
      </button>
    );
  }

  if (!user) {
    return (
      <button
        className="btn-ghost p-1.5"
        title="Sign in to sync"
        aria-label="Sign in"
        onClick={() => toggleAuthModal(true)}
      >
        <LogIn size={16} />
      </button>
    );
  }

  const initial = (user.email || '?')[0]?.toUpperCase() ?? '?';
  const statusColor =
    status === 'synced'
      ? 'bg-emerald-500'
      : status === 'syncing'
      ? 'bg-amber-400 animate-pulse'
      : status === 'error'
      ? 'bg-rose-500'
      : 'bg-slate-400';

  return (
    <div ref={ref} className="relative">
      <button
        className="relative inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shadow-sm focus:outline-none focus-visible:ring-2"
        style={{
          background:
            'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))',
        }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        title={user.email ?? 'Account'}
      >
        {initial}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusColor}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-[color:var(--border-strong)] bg-white dark:bg-slate-900 shadow-xl py-1 animate-slide-up overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[color:var(--border)]">
            <div className="flex items-center gap-2">
              <UserIcon size={14} className="text-slate-400" />
              <span className="text-sm font-medium truncate">{user.email}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Cloud size={11} />
              {status === 'synced' && 'All changes synced'}
              {status === 'syncing' && 'Syncing…'}
              {status === 'error' && 'Sync error — will retry'}
              {status === 'offline' && 'Offline — changes saved locally'}
              {status === 'idle' && 'Ready'}
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              triggerFullSync();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className="text-slate-400" /> Sync now
          </button>
          <button
            onClick={() => {
              setOpen(false);
              usePlannerStore.getState().toggleShareModal(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Share2 size={14} className="text-slate-400" /> Share planner…
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              await supabase?.auth.signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
