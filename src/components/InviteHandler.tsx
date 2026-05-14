import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { acceptInvite, readInviteFromUrl, clearInviteFromUrl, listWorkspaces } from '../lib/share';
import { switchOwner } from '../lib/sync';
import { usePlannerStore } from '../store/plannerStore';

type State =
  | { kind: 'idle' }
  | { kind: 'awaiting-auth'; token: string }
  | { kind: 'accepting'; token: string }
  | { kind: 'accepted'; ownerEmail?: string }
  | { kind: 'error'; message: string };

export function InviteHandler() {
  const { user, loading, enabled } = useAuth();
  const setWorkspaces = usePlannerStore((s) => s.setWorkspaces);
  const toggleAuth = usePlannerStore((s) => s.toggleAuthModal);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current || loading || !enabled) return;
    const token = readInviteFromUrl();
    if (!token) return;
    processed.current = true;

    if (!user) {
      setState({ kind: 'awaiting-auth', token });
      toggleAuth(true);
      return;
    }
    setState({ kind: 'accepting', token });
    acceptInvite(token)
      .then(async (res) => {
        clearInviteFromUrl();
        const ws = await listWorkspaces(user.id, user.email);
        setWorkspaces(ws);
        await switchOwner(res.ownerId);
        setState({ kind: 'accepted', ownerEmail: res.ownerEmail });
      })
      .catch((e) => {
        clearInviteFromUrl();
        setState({ kind: 'error', message: e.message || 'Could not accept invite.' });
      });
  }, [user?.id, loading, enabled]);

  // If user logs in after we deferred, kick off acceptance now.
  useEffect(() => {
    if (state.kind === 'awaiting-auth' && user) {
      setState({ kind: 'accepting', token: state.token });
      acceptInvite(state.token)
        .then(async (res) => {
          clearInviteFromUrl();
          const ws = await listWorkspaces(user.id, user.email);
          setWorkspaces(ws);
          await switchOwner(res.ownerId);
          setState({ kind: 'accepted', ownerEmail: res.ownerEmail });
        })
        .catch((e) => {
          clearInviteFromUrl();
          setState({ kind: 'error', message: e.message || 'Could not accept invite.' });
        });
    }
  }, [user?.id, state.kind]);

  if (state.kind === 'idle' || state.kind === 'awaiting-auth') return null;

  const dismiss = () => setState({ kind: 'idle' });

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] pointer-events-none">
      <div
        className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-[color:var(--border-strong)] bg-white dark:bg-slate-900 pl-3 pr-2 py-2 animate-slide-up"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {state.kind === 'accepting' && (
          <>
            <Loader2 size={14} className="animate-spin text-slate-500" />
            <span className="text-sm">Accepting invite…</span>
          </>
        )}
        {state.kind === 'accepted' && (
          <>
            <div
              className="grid h-7 w-7 place-items-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))' }}
            >
              <UserPlus size={13} />
            </div>
            <span className="text-sm">
              You now have access to {state.ownerEmail ? <strong>{state.ownerEmail}'s</strong> : 'this'} planner.
            </span>
            <button className="btn-ghost p-1" onClick={dismiss} aria-label="Dismiss">
              <Check size={14} />
            </button>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <X size={14} className="text-rose-500" />
            <span className="text-sm text-rose-700 dark:text-rose-300">{state.message}</span>
            <button className="btn-ghost p-1" onClick={dismiss} aria-label="Dismiss">
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
