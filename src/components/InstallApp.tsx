import { useState } from 'react';
import { Download, Share, Plus, Apple, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '';
const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) || '';

interface Props {
  variant?: 'banner' | 'section' | 'compact';
}

export function InstallApp({ variant = 'section' }: Props) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-banner-dismissed') === '1');
  const [installResult, setInstallResult] = useState<string | null>(null);

  const handleInstall = async () => {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') setInstallResult('Installed!');
    else if (outcome === 'dismissed') setInstallResult(null);
  };

  if (variant === 'banner') {
    if (isInstalled || dismissed || (!canInstall && !isIOS)) return null;
    return (
      <div className="relative mx-2 sm:mx-3 mt-2 rounded-xl border border-[color:var(--border-strong)] bg-white/70 dark:bg-white/[0.04] backdrop-blur-md p-3 flex items-center gap-3 animate-slide-up">
        <div
          className="h-9 w-9 shrink-0 grid place-items-center rounded-lg text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))' }}
        >
          <Smartphone size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold tracking-tight">Install Weekly Planner</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {isIOS ? 'Add to your home screen for a native-app feel.' : 'Get the offline-capable app, one tap away.'}
          </div>
        </div>
        <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={handleInstall}>
          <Download size={13} /> Install
        </button>
        <button
          className="btn-ghost p-1"
          onClick={() => {
            setDismissed(true);
            localStorage.setItem('pwa-banner-dismissed', '1');
          }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
        <IOSInstructions open={iosOpen} onClose={() => setIosOpen(false)} />
      </div>
    );
  }

  if (variant === 'compact') {
    if (isInstalled) return null;
    return (
      <>
        <button className="btn-ghost p-1.5" onClick={handleInstall} title="Install app" aria-label="Install app">
          <Download size={16} />
        </button>
        <IOSInstructions open={iosOpen} onClose={() => setIosOpen(false)} />
      </>
    );
  }

  // Full section (used inside Settings or a dedicated page)
  return (
    <div className="space-y-4">
      {!isInstalled && (
        <div className="rounded-xl border border-[color:var(--border-strong)] bg-white/60 dark:bg-white/[0.03] backdrop-blur-md p-4">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 shrink-0 grid place-items-center rounded-xl text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))' }}
            >
              <Smartphone size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold tracking-tight">Install on this device</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Works offline, opens in its own window, and gets its own home-screen icon.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <button className="btn-primary text-xs" onClick={handleInstall}>
                  <Download size={13} />
                  {isIOS ? 'Show iOS instructions' : 'Install now'}
                </button>
                {installResult && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={12} /> {installResult}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 mb-2">
          Get the native app
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <StoreBadge
            kind="apple"
            href={APP_STORE_URL}
            disabledLabel="App Store · coming soon"
          />
          <StoreBadge
            kind="google"
            href={PLAY_STORE_URL}
            disabledLabel="Google Play · coming soon"
          />
        </div>
      </div>

      <IOSInstructions open={iosOpen} onClose={() => setIosOpen(false)} />
    </div>
  );
}

function StoreBadge({
  kind,
  href,
  disabledLabel,
}: {
  kind: 'apple' | 'google';
  href: string;
  disabledLabel: string;
}) {
  const enabled = !!href;
  const baseProps = enabled
    ? { href, target: '_blank' as const, rel: 'noopener noreferrer' }
    : { 'aria-disabled': true, href: undefined, onClick: (e: React.MouseEvent) => e.preventDefault() };

  return (
    <a
      {...(baseProps as any)}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150 ${
        enabled
          ? 'border-[color:var(--border-strong)] bg-slate-950 text-white hover:scale-[1.01] hover:shadow-md cursor-pointer dark:bg-white dark:text-slate-950'
          : 'border-[color:var(--border)] bg-slate-100/70 dark:bg-white/[0.03] text-slate-400 dark:text-slate-500 cursor-not-allowed'
      }`}
    >
      {kind === 'apple' ? <Apple size={22} className="shrink-0" /> : <PlayStoreIcon className="h-[22px] w-[22px] shrink-0" />}
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider opacity-70">
          {enabled ? (kind === 'apple' ? 'Download on the' : 'Get it on') : 'Coming soon'}
        </div>
        <div className="text-sm font-semibold">
          {enabled ? (kind === 'apple' ? 'App Store' : 'Google Play') : disabledLabel.split(' · ')[0]}
        </div>
      </div>
    </a>
  );
}

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.6 1.5C3.2 1.7 3 2 3 2.5v19c0 .5.2.8.6 1l9.1-10-9.1-10z" />
      <path d="M13.7 11.5 16.4 8.7 5.2 2.3l8.5 9.2z" opacity=".75" />
      <path d="M5.2 21.7l11.2-6.4-2.7-2.8-8.5 9.2z" opacity=".6" />
      <path d="M16.4 8.7l-2.7 2.8 2.7 2.8 4-2.3c.8-.5.8-1.6 0-2l-4-1.3z" opacity=".9" />
    </svg>
  );
}

function IOSInstructions({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-[color:var(--border-strong)] p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold tracking-tight">Add to Home Screen</h3>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-start gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent-subtle)] text-[color:var(--accent)] font-bold text-xs">
              1
            </span>
            <span>
              Tap the <Share size={13} className="inline -mt-0.5 mx-1" /> <strong>Share</strong> button in Safari's toolbar.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent-subtle)] text-[color:var(--accent)] font-bold text-xs">
              2
            </span>
            <span>
              Scroll down and tap <Plus size={13} className="inline -mt-0.5 mx-1" /> <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent-subtle)] text-[color:var(--accent)] font-bold text-xs">
              3
            </span>
            <span>Tap <strong>Add</strong> in the top-right corner — done.</span>
          </li>
        </ol>
        <button className="btn-primary w-full mt-4" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
