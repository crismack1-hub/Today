import { useEffect } from 'react';
import { usePlannerStore } from '../store/plannerStore';

export function useKeyboardShortcuts(): void {
  const s = usePlannerStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K — palette (works even in fields)
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        s.toggleCommandPalette();
        return;
      }
      // Cmd/Ctrl+Z — undo
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (inField) return;
        e.preventDefault();
        s.undo();
        return;
      }
      // Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y — redo
      if ((mod && e.shiftKey && e.key.toLowerCase() === 'z') || (mod && e.key.toLowerCase() === 'y')) {
        if (inField) return;
        e.preventDefault();
        s.redo();
        return;
      }

      if (inField) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (!mod) {
            e.preventDefault();
            s.openEventModal(null);
          }
          break;
        case 't':
          s.goToToday();
          break;
        case 'd':
          s.setView('day');
          break;
        case 'w':
          s.setView('week');
          break;
        case 'm':
          s.setView('month');
          break;
        case 'a':
          s.setView('agenda');
          break;
        case 'arrowleft':
          s.navigate(-1);
          break;
        case 'arrowright':
          s.navigate(1);
          break;
        case '/':
          e.preventDefault();
          s.toggleCommandPalette(true);
          break;
        case '?':
          // Could open shortcuts help; for now toggle settings
          s.toggleSettings(true);
          break;
        case 'escape':
          if (s.isCommandPaletteOpen) s.toggleCommandPalette(false);
          else if (s.isEventModalOpen) s.closeEventModal();
          else if (s.isSettingsOpen) s.toggleSettings(false);
          else if (s.isImportExportOpen) s.toggleImportExport(false);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);
}
