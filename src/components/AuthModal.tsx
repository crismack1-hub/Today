import { useState } from 'react';
import { Modal } from './Modal';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { Mail, Loader2, Cloud, Check } from 'lucide-react';
import { usePlannerStore } from '../store/plannerStore';

export function AuthModal() {
  const isOpen = usePlannerStore((s) => s.isAuthModalOpen);
  const close = usePlannerStore((s) => s.toggleAuthModal);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [isSignup, setIsSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!supabaseEnabled) {
    return (
      <Modal open onClose={() => close(false)} title="Cloud sync" size="sm">
        <div className="space-y-3 px-5 py-5 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Cloud size={18} /> Cloud sync is not configured.
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, restart the dev server, and you'll see sign-in options here.
          </p>
          <p className="text-slate-500 text-xs">
            See <code>README.md</code> for the full setup walkthrough.
          </p>
        </div>
      </Modal>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'magic') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        setMessage('Check your email for a sign-in link.');
      } else if (isSignup) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMessage('Account created. Check your email to confirm if required.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        close(false);
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={() => close(false)} title="Sign in to sync" size="sm">
      <form onSubmit={submit} className="space-y-3 px-5 py-5">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your planner will sync across every device you sign in on — phone, tablet, and laptop.
        </p>

        <div className="segmented w-full">
          <button
            type="button"
            data-active={mode === 'magic'}
            onClick={() => setMode('magic')}
            className="flex-1"
          >
            Magic link
          </button>
          <button
            type="button"
            data-active={mode === 'password'}
            onClick={() => setMode('password')}
            className="flex-1"
          >
            Email + password
          </button>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            required
            autoFocus
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {mode === 'password' && (
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 mt-1"
              onClick={() => setIsSignup((v) => !v)}
            >
              {isSignup ? 'Have an account? Sign in instead' : 'Need an account? Sign up'}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm px-3 py-2">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm px-3 py-2 flex items-center gap-2">
            <Check size={14} /> {message}
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {mode === 'magic' ? 'Email me a sign-in link' : isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </Modal>
  );
}
