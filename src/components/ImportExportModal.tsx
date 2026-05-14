import { useRef, useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { Modal } from './Modal';
import { downloadICS, importICS } from '../lib/ics';
import { FileUp, FileDown, Database } from 'lucide-react';

export function ImportExportModal() {
  const s = usePlannerStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const imported = importICS(text);
      s.importEvents(imported);
      setMessage(`Imported ${imported.length} event(s).`);
    } catch (e) {
      console.error(e);
      setMessage('Failed to import .ics file.');
    }
  };

  const exportJSON = () => {
    const data = {
      events: s.events,
      categories: s.categories,
      goals: s.goals,
      habits: s.habits,
      settings: s.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={s.isImportExportOpen} onClose={() => s.toggleImportExport(false)} title="Import / Export" size="md">
      <div className="space-y-4 px-5 py-4">
        <section>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <FileUp size={14} /> Import
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            Import events from a standard <code>.ics</code> file (Google Calendar, Apple Calendar, Outlook, etc.).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            Choose .ics file…
          </button>
        </section>

        <section>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <FileDown size={14} /> Export
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            Export your events to <code>.ics</code> (iCalendar) or a JSON backup.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => downloadICS(s.events, `planner-${new Date().toISOString().slice(0, 10)}.ics`)}
            >
              <FileDown size={14} /> Export .ics
            </button>
            <button className="btn-secondary" onClick={exportJSON}>
              <Database size={14} /> Export JSON
            </button>
          </div>
        </section>

        {message && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm px-3 py-2">
            {message}
          </div>
        )}
      </div>
    </Modal>
  );
}
