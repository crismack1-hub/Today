import { usePlannerStore } from '../store/plannerStore';
import { Modal } from './Modal';
import { InstallApp } from './InstallApp';
import { requestPermission, notificationsAllowed } from '../lib/notifications';
import { useState } from 'react';
import type { BgTheme } from '../types';

const ACCENT_PRESETS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899'];

const BG_THEMES: { id: BgTheme; label: string; preview: string }[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    preview:
      'radial-gradient(at 15% 15%, rgba(99,102,241,0.6) 0, transparent 55%), radial-gradient(at 85% 25%, rgba(236,72,153,0.55) 0, transparent 55%), radial-gradient(at 75% 90%, rgba(56,189,248,0.55) 0, transparent 55%), radial-gradient(at 25% 90%, rgba(34,197,94,0.4) 0, transparent 55%)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    preview:
      'radial-gradient(at 0% 0%, rgba(251,113,133,0.7) 0, transparent 55%), radial-gradient(at 100% 20%, rgba(251,146,60,0.7) 0, transparent 55%), radial-gradient(at 50% 100%, rgba(217,70,239,0.55) 0, transparent 55%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    preview:
      'radial-gradient(at 10% 10%, rgba(14,165,233,0.7) 0, transparent 55%), radial-gradient(at 90% 30%, rgba(20,184,166,0.6) 0, transparent 55%), radial-gradient(at 70% 95%, rgba(99,102,241,0.5) 0, transparent 55%)',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    preview:
      'radial-gradient(at 20% 10%, rgba(168,85,247,0.7) 0, transparent 55%), radial-gradient(at 80% 20%, rgba(217,70,239,0.55) 0, transparent 55%), radial-gradient(at 60% 100%, rgba(129,140,248,0.6) 0, transparent 55%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    preview:
      'radial-gradient(at 0% 10%, rgba(34,197,94,0.65) 0, transparent 55%), radial-gradient(at 95% 0%, rgba(132,204,22,0.55) 0, transparent 55%), radial-gradient(at 70% 95%, rgba(16,185,129,0.6) 0, transparent 55%)',
  },
  {
    id: 'candy',
    label: 'Candy',
    preview:
      'radial-gradient(at 15% 0%, rgba(236,72,153,0.7) 0, transparent 55%), radial-gradient(at 85% 10%, rgba(250,204,21,0.55) 0, transparent 55%), radial-gradient(at 50% 100%, rgba(56,189,248,0.65) 0, transparent 55%), radial-gradient(at 0% 70%, rgba(168,85,247,0.55) 0, transparent 55%)',
  },
  {
    id: 'mono',
    label: 'Mono',
    preview: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
  },
];

export function SettingsModal() {
  const s = usePlannerStore();
  const [notifStatus, setNotifStatus] = useState(notificationsAllowed());

  return (
    <Modal open={s.isSettingsOpen} onClose={() => s.toggleSettings(false)} title="Settings" size="md">
      <div className="space-y-4 px-5 py-4">
        <div>
          <label className="label">Theme</label>
          <div className="flex gap-1.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => s.setSettings({ theme: t })}
                className={`btn-secondary capitalize ${s.settings.theme === t ? '!border-2' : ''}`}
                style={s.settings.theme === t ? { borderColor: 'var(--accent)' } : undefined}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Background</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {BG_THEMES.map((bg) => {
              const active = s.settings.bgTheme === bg.id;
              return (
                <button
                  key={bg.id}
                  onClick={() => s.setSettings({ bgTheme: bg.id })}
                  className="group flex flex-col items-center gap-1"
                  title={bg.label}
                >
                  <span
                    className="block h-12 w-full rounded-xl transition-all duration-150 group-hover:scale-[1.03]"
                    style={{
                      backgroundImage: bg.preview,
                      backgroundColor: '#f8fafc',
                      boxShadow: active
                        ? `0 0 0 2px var(--accent), 0 6px 16px -4px color-mix(in srgb, var(--accent) 30%, transparent)`
                        : 'inset 0 0 0 1px var(--border-strong)',
                    }}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      active ? '' : 'text-slate-500 dark:text-slate-400'
                    }`}
                    style={active ? { color: 'var(--accent)' } : undefined}
                  >
                    {bg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Accent color</label>
          <div className="flex gap-1.5">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => s.setSettings({ accent: c })}
                className="h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-all"
                style={{
                  backgroundColor: c,
                  boxShadow: s.settings.accent === c ? `0 0 0 2px ${c}` : undefined,
                }}
              />
            ))}
            <input
              type="color"
              value={s.settings.accent}
              onChange={(e) => s.setSettings({ accent: e.target.value })}
              className="h-7 w-7 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Week starts on</label>
            <select
              className="input"
              value={s.settings.weekStartsOn}
              onChange={(e) => s.setSettings({ weekStartsOn: (+e.target.value) as 0 | 1 })}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
            </select>
          </div>
          <div>
            <label className="label">Time format</label>
            <select
              className="input"
              value={s.settings.use24HourClock ? '24' : '12'}
              onChange={(e) => s.setSettings({ use24HourClock: e.target.value === '24' })}
            >
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </div>
          <div>
            <label className="label">Slot granularity</label>
            <select
              className="input"
              value={s.settings.slotMinutes}
              onChange={(e) => s.setSettings({ slotMinutes: +e.target.value as 15 | 30 | 60 })}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
          <div>
            <label className="label">Show weekends</label>
            <select
              className="input"
              value={s.settings.showWeekends ? 'yes' : 'no'}
              onChange={(e) => s.setSettings({ showWeekends: e.target.value === 'yes' })}
            >
              <option value="yes">Yes</option>
              <option value="no">No (Mon-Fri only)</option>
            </select>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Browser notifications</div>
              <div className="text-xs text-slate-500">
                {notifStatus ? 'Permission granted' : 'Permission required for reminders'}
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={async () => {
                const p = await requestPermission();
                setNotifStatus(p === 'granted');
                if (p === 'granted') s.setSettings({ notificationsEnabled: true });
              }}
            >
              {notifStatus ? 'Enabled' : 'Enable'}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.settings.notificationsEnabled}
              onChange={(e) => s.setSettings({ notificationsEnabled: e.target.checked })}
              disabled={!notifStatus}
            />
            Fire reminders for upcoming events
          </label>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-white/40 dark:bg-white/[0.02] p-4">
          <div className="text-sm font-semibold tracking-tight mb-2">Get the app</div>
          <InstallApp variant="section" />
        </div>

        <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-3">
          <div className="text-sm font-medium text-rose-700 dark:text-rose-300">Danger zone</div>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
            This will reset all events, categories, goals and habits to defaults.
          </p>
          <button
            className="btn-danger mt-2"
            onClick={() => {
              if (confirm('Reset all data to defaults?')) s.resetAll();
            }}
          >
            Reset all data
          </button>
        </div>
      </div>
    </Modal>
  );
}
