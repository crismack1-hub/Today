import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings as SettingsIcon,
  Calendar as CalendarIcon,
  Undo2,
  Redo2,
  Menu,
  Download,
  Moon,
  Sun,
  MoreHorizontal,
} from 'lucide-react';
import { usePlannerStore } from '../store/plannerStore';
import { fromISO, formatHeaderRange } from '../lib/dates';
import { AuthButton } from './AuthButton';
import { InstallApp } from './InstallApp';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import type { ViewMode } from '../types';

const VIEWS: { id: ViewMode; label: string; short: string; hint: string }[] = [
  { id: 'day', label: 'Day', short: 'D', hint: 'D' },
  { id: 'week', label: 'Week', short: 'W', hint: 'W' },
  { id: 'month', label: 'Month', short: 'M', hint: 'M' },
  { id: 'agenda', label: 'Agenda', short: 'A', hint: 'A' },
];

export function TopBar() {
  const s = usePlannerStore();
  const range = formatHeaderRange(s.view, fromISO(s.currentDate), s.settings.weekStartsOn);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const theme = s.settings.theme;
  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    s.setSettings({ theme: next });
  };
  const themeIcon = theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <CalendarIcon size={16} />;

  return (
    <header className="glass flex items-center gap-1 sm:gap-2 border-b border-[color:var(--border)] px-2 sm:px-3 py-2 z-20">
      <button
        className="btn-ghost p-1.5"
        onClick={s.toggleSidebar}
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>
      <button className="btn-secondary !px-2 sm:!px-3 text-xs sm:text-sm" onClick={s.goToToday} title="Today (T)">
        Today
      </button>
      <div className="flex items-center">
        <button className="btn-ghost p-1" onClick={() => s.navigate(-1)} aria-label="Previous">
          <ChevronLeft size={18} />
        </button>
        <button className="btn-ghost p-1" onClick={() => s.navigate(1)} aria-label="Next">
          <ChevronRight size={18} />
        </button>
      </div>
      <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate min-w-0">{range}</h1>

      <div className="ml-auto flex items-center gap-1">
        {/* View switcher — segmented control with sliding active state */}
        <div className="segmented" role="tablist" aria-label="View">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => s.setView(v.id)}
              data-active={s.view === v.id}
              title={`${v.label} (${v.hint})`}
              aria-label={v.label}
              role="tab"
              aria-selected={s.view === v.id}
            >
              <span className="sm:hidden">{v.short}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Desktop: all buttons inline */}
        <div className="hidden md:flex items-center gap-1">
          <InstallApp variant="compact" />
          <WorkspaceSwitcher />
          <AuthButton />
          <button
            className="btn-ghost p-1.5"
            onClick={() => s.toggleCommandPalette(true)}
            title="Search & commands (Ctrl/Cmd+K)"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
          <button
            className="btn-ghost p-1.5"
            onClick={s.undo}
            disabled={!s.canUndo()}
            title="Undo (Ctrl/Cmd+Z)"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="btn-ghost p-1.5"
            onClick={s.redo}
            disabled={!s.canRedo()}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
          <button className="btn-ghost p-1.5" onClick={() => s.toggleImportExport(true)} title="Import / Export" aria-label="Import/Export">
            <Download size={16} />
          </button>
          <button className="btn-ghost p-1.5" onClick={cycleTheme} title={`Theme: ${theme}`} aria-label="Theme">
            {themeIcon}
          </button>
          <button className="btn-ghost p-1.5" onClick={() => s.toggleSettings(true)} title="Settings" aria-label="Settings">
            <SettingsIcon size={16} />
          </button>
        </div>

        {/* Mobile: install + auth + search + more menu */}
        <div className="md:hidden flex items-center gap-1">
          <InstallApp variant="compact" />
          <WorkspaceSwitcher />
          <AuthButton />
          <button
            className="btn-ghost p-1.5"
            onClick={() => s.toggleCommandPalette(true)}
            title="Search"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
          <div ref={moreRef} className="relative">
            <button
              className="btn-ghost p-1.5"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More actions"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={16} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1 animate-slide-up">
                <MenuItem
                  icon={<Undo2 size={14} />}
                  label="Undo"
                  hint="⌘Z"
                  disabled={!s.canUndo()}
                  onClick={() => {
                    s.undo();
                    setMoreOpen(false);
                  }}
                />
                <MenuItem
                  icon={<Redo2 size={14} />}
                  label="Redo"
                  hint="⌘⇧Z"
                  disabled={!s.canRedo()}
                  onClick={() => {
                    s.redo();
                    setMoreOpen(false);
                  }}
                />
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <MenuItem
                  icon={themeIcon}
                  label={`Theme: ${theme}`}
                  onClick={() => {
                    cycleTheme();
                    setMoreOpen(false);
                  }}
                />
                <MenuItem
                  icon={<Download size={14} />}
                  label="Import / Export"
                  onClick={() => {
                    s.toggleImportExport(true);
                    setMoreOpen(false);
                  }}
                />
                <MenuItem
                  icon={<SettingsIcon size={14} />}
                  label="Settings"
                  onClick={() => {
                    s.toggleSettings(true);
                    setMoreOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <button className="btn-primary !px-2 sm:!px-3" onClick={() => s.openEventModal(null)} title="New event (N)" aria-label="New event">
          <Plus size={16} />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>
    </header>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, hint, disabled, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <kbd>{hint}</kbd>}
    </button>
  );
}
