import { CalendarDays, Tag, Target, Repeat, X, Plus, Clock } from 'lucide-react';
import { usePlannerStore } from '../store/plannerStore';
import { MiniCalendar } from './MiniCalendar';
import { GoalsPanel } from './GoalsPanel';
import { HabitsPanel } from './HabitsPanel';
import { UpcomingPanel } from './UpcomingPanel';
import clsx from 'clsx';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps = {}) {
  const s = usePlannerStore();

  return (
    <aside className="glass flex h-full w-72 flex-col border-r border-[color:var(--border)]">
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[color:var(--border)]">
        <div
          className="grid h-7 w-7 place-items-center rounded-lg text-white shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))',
          }}
        >
          <CalendarDays size={16} strokeWidth={2.5} />
        </div>
        <span className="font-semibold tracking-tight">Weekly Planner</span>
        {onCloseMobile && (
          <button className="btn-ghost ml-auto p-1" onClick={onCloseMobile} aria-label="Close menu">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto calendar-scroll py-4 space-y-6">
        <MiniCalendar />

        <SectionHeader icon={<Clock size={11} />} title="Upcoming" />
        <div className="-mt-2">
          <UpcomingPanel />
        </div>

        <SectionHeader icon={<Tag size={11} />} title="Categories">
          {s.filteredCategoryIds && (
            <button
              onClick={s.clearCategoryFilter}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Clear filter"
            >
              <X size={12} />
            </button>
          )}
        </SectionHeader>

        <ul className="space-y-0.5 px-2 -mt-2">
          {s.categories.map((c) => {
            const active = !s.filteredCategoryIds || s.filteredCategoryIds.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  onClick={() => s.toggleCategoryFilter(c.id)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-all duration-150',
                    active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600',
                    'hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]',
                  )}
                >
                  <span
                    className={clsx(
                      'h-2.5 w-2.5 rounded-full shrink-0 transition-all',
                      !active && 'opacity-40 scale-75',
                    )}
                    style={{ backgroundColor: c.color, boxShadow: active ? `0 0 0 3px ${c.color}22` : undefined }}
                  />
                  {c.name}
                </button>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => {
                const name = prompt('Category name?');
                if (!name) return;
                const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                s.addCategory({ name, color });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]"
            >
              <Plus size={12} /> Add category
            </button>
          </li>
        </ul>

        <SectionHeader icon={<Target size={11} />} title="Weekly Goals" />
        <div className="-mt-2">
          <GoalsPanel />
        </div>

        <SectionHeader icon={<Repeat size={11} />} title="Habits" />
        <div className="-mt-2">
          <HabitsPanel />
        </div>
      </div>
      <div className="border-t border-[color:var(--border)] px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400">
        <kbd>?</kbd> shortcuts · <kbd>Ctrl/⌘</kbd>+<kbd>K</kbd> commands
      </div>
    </aside>
  );
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}

function SectionHeader({ icon, title, children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 mb-1">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
