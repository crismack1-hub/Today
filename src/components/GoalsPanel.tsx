import { useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { Plus, X, Check } from 'lucide-react';
import { dayKey, fromISO, startOfWeek } from '../lib/dates';
import clsx from 'clsx';

export function GoalsPanel() {
  const s = usePlannerStore();
  const [newGoal, setNewGoal] = useState('');
  const week = dayKey(startOfWeek(fromISO(s.currentDate), { weekStartsOn: s.settings.weekStartsOn }));
  const goals = s.goals.filter((g) => g.weekStart === week);
  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? (done / goals.length) * 100 : 0;

  return (
    <div className="px-2 space-y-1.5">
      {goals.length > 0 && (
        <div className="px-2">
          <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{done}/{goals.length} done</div>
        </div>
      )}
      <ul className="space-y-0.5">
        {goals.map((g) => (
          <li key={g.id} className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <button
              onClick={() => s.toggleGoal(g.id)}
              className={clsx(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                g.done
                  ? 'border-transparent text-white'
                  : 'border-slate-300 dark:border-slate-600',
              )}
              style={g.done ? { backgroundColor: 'var(--accent)' } : undefined}
            >
              {g.done && <Check size={10} />}
            </button>
            <span className={clsx('flex-1 text-sm', g.done && 'line-through text-slate-400')}>{g.title}</span>
            <button
              onClick={() => s.deleteGoal(g.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newGoal.trim()) return;
          s.addGoal({ title: newGoal.trim(), weekStart: week, done: false });
          setNewGoal('');
        }}
        className="flex items-center gap-1 px-2"
      >
        <input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Add weekly goal…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 py-1"
        />
        <button type="submit" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <Plus size={14} />
        </button>
      </form>
    </div>
  );
}
