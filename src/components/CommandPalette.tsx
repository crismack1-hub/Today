import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { usePlannerStore } from '../store/plannerStore';
import {
  Calendar,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Download,
  Undo2,
  Redo2,
  Eye,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { format, fromISO } from '../lib/dates';

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: JSX.Element;
  run: () => void;
  group: string;
}

export function CommandPalette() {
  const s = usePlannerStore();
  const open = s.isCommandPaletteOpen;
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const commands: Item[] = useMemo(() => {
    const base: Item[] = [
      { id: 'new', label: 'New event', hint: 'N', icon: <Plus size={14} />, run: () => s.openEventModal(null), group: 'Actions' },
      { id: 'today', label: 'Go to today', hint: 'T', icon: <Calendar size={14} />, run: s.goToToday, group: 'Navigation' },
      { id: 'day', label: 'Day view', hint: 'D', icon: <Eye size={14} />, run: () => s.setView('day'), group: 'View' },
      { id: 'week', label: 'Week view', hint: 'W', icon: <Eye size={14} />, run: () => s.setView('week'), group: 'View' },
      { id: 'month', label: 'Month view', hint: 'M', icon: <Eye size={14} />, run: () => s.setView('month'), group: 'View' },
      { id: 'agenda', label: 'Agenda view', hint: 'A', icon: <Eye size={14} />, run: () => s.setView('agenda'), group: 'View' },
      { id: 'theme-light', label: 'Theme: light', icon: <Sun size={14} />, run: () => s.setSettings({ theme: 'light' }), group: 'Settings' },
      { id: 'theme-dark', label: 'Theme: dark', icon: <Moon size={14} />, run: () => s.setSettings({ theme: 'dark' }), group: 'Settings' },
      { id: 'theme-sys', label: 'Theme: system', icon: <Calendar size={14} />, run: () => s.setSettings({ theme: 'system' }), group: 'Settings' },
      { id: 'settings', label: 'Open settings', icon: <SettingsIcon size={14} />, run: () => s.toggleSettings(true), group: 'Settings' },
      { id: 'ie', label: 'Import / Export…', icon: <Download size={14} />, run: () => s.toggleImportExport(true), group: 'Actions' },
      { id: 'undo', label: 'Undo', hint: 'Ctrl+Z', icon: <Undo2 size={14} />, run: s.undo, group: 'Actions' },
      { id: 'redo', label: 'Redo', hint: 'Ctrl+Shift+Z', icon: <Redo2 size={14} />, run: s.redo, group: 'Actions' },
    ];
    const eventItems: Item[] = s.events.slice(0, 200).map((e) => ({
      id: `e-${e.id}`,
      label: e.title,
      hint: format(fromISO(e.start), 'MMM d, p'),
      icon: <ChevronRight size={14} />,
      run: () => {
        s.setCurrentDate(fromISO(e.start));
        s.openEventModal(e.id);
      },
      group: 'Events',
    }));
    return [...base, ...eventItems];
  }, [s.events, s.view]);

  const fuse = useMemo(
    () => new Fuse(commands, { keys: ['label', 'hint', 'group'], threshold: 0.4 }),
    [commands],
  );

  const results = useMemo(() => {
    if (!q.trim()) return commands.slice(0, 20);
    return fuse.search(q).slice(0, 30).map((r) => r.item);
  }, [q, commands, fuse]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) return null;

  const choose = (i: Item) => {
    i.run();
    s.toggleCommandPalette(false);
  };

  const grouped: Array<{ group: string; items: Item[] }> = [];
  for (const it of results) {
    const last = grouped[grouped.length - 1];
    if (last && last.group === it.group) last.items.push(it);
    else grouped.push({ group: it.group, items: [it] });
  }
  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 backdrop-blur-md pt-[10vh] px-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) s.toggleCommandPalette(false);
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-[color:var(--border-strong)] animate-slide-up overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center gap-2 border-b border-[color:var(--border)] px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, run commands…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(Math.min(results.length - 1, active + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(Math.max(0, active - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const it = results[active];
                if (it) choose(it);
              }
            }}
          />
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto calendar-scroll py-1">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-slate-500">No results</div>
          )}
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-400">
                {group}
              </div>
              {items.map((it) => {
                const idx = flatIndex++;
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => choose(it)}
                    className={clsx(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      idx === active
                        ? 'bg-[color:var(--accent-subtle)] text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04]',
                    )}
                  >
                    <span className="text-slate-400">{it.icon}</span>
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.hint && <kbd>{it.hint}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[11px] text-slate-500 flex items-center gap-3">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
