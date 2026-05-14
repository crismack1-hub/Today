import { useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { Plus, X } from 'lucide-react';
import { addDays, dayKey, fromISO, startOfWeek, format } from '../lib/dates';
import clsx from 'clsx';

export function HabitsPanel() {
  const s = usePlannerStore();
  const [name, setName] = useState('');
  const weekStart = startOfWeek(fromISO(s.currentDate), { weekStartsOn: s.settings.weekStartsOn });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="px-2 space-y-2">
      <div className="px-2">
        {s.habits.length > 0 && (
          <div className="grid mb-1" style={{ gridTemplateColumns: '1fr repeat(7, 18px)' }}>
            <span />
            {days.map((d) => (
              <div key={d.toISOString()} className="text-center text-[9px] text-slate-400">
                {format(d, 'EEEEE')}
              </div>
            ))}
          </div>
        )}
        <ul className="space-y-1">
          {s.habits.map((h) => {
            const count = days.filter((d) => h.completions[dayKey(d)]).length;
            return (
              <li key={h.id} className="group grid items-center" style={{ gridTemplateColumns: '1fr repeat(7, 18px)' }}>
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <span className="text-sm">{h.emoji || '•'}</span>
                  <span className="text-sm truncate">{h.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto pr-1">{count}/{h.target}</span>
                  <button
                    onClick={() => s.deleteHabit(h.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X size={11} />
                  </button>
                </div>
                {days.map((d) => {
                  const k = dayKey(d);
                  const on = !!h.completions[k];
                  return (
                    <button
                      key={k}
                      onClick={() => s.toggleHabitDay(h.id, d)}
                      className={clsx(
                        'mx-auto h-3.5 w-3.5 rounded-sm transition-colors',
                        on ? '' : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700',
                      )}
                      style={on ? { backgroundColor: h.color } : undefined}
                      title={format(d, 'EEE MMM d')}
                    />
                  );
                })}
              </li>
            );
          })}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            s.addHabit({
              name: name.trim(),
              emoji: '✨',
              color: '#6366f1',
              target: 7,
            });
            setName('');
          }}
          className="flex items-center gap-1 mt-1"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New habit…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 py-1"
          />
          <button type="submit" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Plus size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
