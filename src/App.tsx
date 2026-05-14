import { useEffect } from 'react';
import { usePlannerStore } from './store/plannerStore';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useIsMobile } from './hooks/useMediaQuery';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { AgendaView } from './components/AgendaView';
import { EventModal } from './components/EventModal';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { AuthModal } from './components/AuthModal';
import { InstallApp } from './components/InstallApp';
import { ReminderToasts } from './components/ReminderToasts';
import { ShareModal } from './components/ShareModal';
import { InviteHandler } from './components/InviteHandler';
import { fromISO } from './lib/dates';
import { expandAll } from './lib/recurrence';
import { fireReminders } from './lib/notifications';
import { useAuth } from './hooks/useAuth';
import { startSync, stopSync } from './lib/sync';

export default function App() {
  useTheme();
  useKeyboardShortcuts();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const view = usePlannerStore((s) => s.view);
  const events = usePlannerStore((s) => s.events);
  const currentDate = usePlannerStore((s) => s.currentDate);
  const sidebarOpen = usePlannerStore((s) => s.sidebarOpen);
  const toggleSidebar = usePlannerStore((s) => s.toggleSidebar);
  const notificationsEnabled = usePlannerStore((s) => s.settings.notificationsEnabled);

  const activeOwnerId = usePlannerStore((s) => s.activeOwnerId);

  // Start / stop cloud sync as auth changes
  useEffect(() => {
    if (user) startSync(user.id, activeOwnerId || user.id);
    else stopSync();
  }, [user?.id]);

  // Default sidebar closed on mobile
  useEffect(() => {
    const initial = !window.matchMedia('(max-width: 767px)').matches;
    if (!initial && usePlannerStore.getState().sidebarOpen) {
      usePlannerStore.setState({ sidebarOpen: false });
    }
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const tick = () => {
      const now = new Date();
      const horizon = new Date(now.getTime() + 24 * 3600 * 1000);
      const inst = expandAll(events, now, horizon);
      fireReminders(inst);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [events, notificationsEnabled]);

  const ref = fromISO(currentDate);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Sidebar — overlay on mobile, inline on desktop */}
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden animate-fade-in"
              onClick={toggleSidebar}
              aria-hidden
            />
          )}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 md:hidden ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onCloseMobile={toggleSidebar} />
          </div>
        </>
      ) : (
        sidebarOpen && <Sidebar />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <InstallApp variant="banner" />
        <main className="flex-1 overflow-hidden">
          {view === 'week' && <WeekView referenceDate={ref} />}
          {view === 'day' && <WeekView referenceDate={ref} singleDay />}
          {view === 'month' && <MonthView referenceDate={ref} />}
          {view === 'agenda' && <AgendaView referenceDate={ref} />}
        </main>
      </div>
      <EventModal />
      <CommandPalette />
      <SettingsModal />
      <ImportExportModal />
      <AuthModal />
      <ShareModal />
      <ReminderToasts />
      <InviteHandler />
    </div>
  );
}
