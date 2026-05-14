import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { usePlannerStore } from '../store/plannerStore';
import { useAuth } from '../hooks/useAuth';
import {
  createInvite,
  listMembers,
  revokeMember,
} from '../lib/share';
import type { PlannerMember } from '../types';
import { supabaseEnabled } from '../lib/supabase';
import { Copy, Link2, UserMinus, Users, Loader2, Check, Share2 } from 'lucide-react';

export function ShareModal() {
  const isOpen = usePlannerStore((s) => s.isShareModalOpen);
  const close = usePlannerStore((s) => s.toggleShareModal);
  const { user } = useAuth();

  const [members, setMembers] = useState<PlannerMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);
    listMembers(user.id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  if (!supabaseEnabled || !user) {
    return (
      <Modal open onClose={() => close(false)} title="Share planner" size="sm">
        <div className="space-y-3 px-5 py-5 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Share2 size={18} /> Sharing requires cloud sync.
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to your Supabase-backed account first. See <code>README.md</code> for setup.
          </p>
          <button className="btn-primary w-full" onClick={() => {
            close(false);
            usePlannerStore.getState().toggleAuthModal(true);
          }}>
            Sign in
          </button>
        </div>
      </Modal>
    );
  }

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const inv = await createInvite({
        ownerId: user.id,
        ownerEmail: user.email,
        role,
        ttlDays: 7,
      });
      setLink(inv.url);
      setCopied(false);
    } catch (e: any) {
      setError(e.message || 'Failed to create invite.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select text via prompt
      window.prompt('Copy this link:', link);
    }
  };

  const revoke = async (memberId: string) => {
    if (!confirm('Revoke this person\'s access?')) return;
    await revokeMember(user.id, memberId);
    setMembers((cur) => cur.filter((m) => m.memberId !== memberId));
  };

  return (
    <Modal
      open
      onClose={() => close(false)}
      title={
        <span className="inline-flex items-center gap-2">
          <Share2 size={16} /> Share planner
        </span>
      }
      size="md"
    >
      <div className="px-5 py-4 space-y-4 text-sm">
        <p className="text-slate-600 dark:text-slate-400">
          Generate a one-time invite link. Whoever opens it (after signing in) will see your planner in real time.
        </p>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</label>
          <div className="segmented">
            <button data-active={role === 'editor'} onClick={() => setRole('editor')}>
              Editor
            </button>
            <button data-active={role === 'viewer'} onClick={() => setRole('viewer')}>
              Viewer
            </button>
          </div>
        </div>

        <button className="btn-primary w-full" onClick={generate} disabled={generating}>
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Generate invite link
        </button>

        {error && (
          <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {link && (
          <div className="rounded-xl border border-[color:var(--border-strong)] bg-white/70 dark:bg-white/[0.03] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Invite link · expires in 7 days
            </div>
            <div className="flex items-center gap-2">
              <input className="input flex-1 text-xs" value={link} readOnly onFocus={(e) => e.currentTarget.select()} />
              <button className="btn-secondary !px-2.5" onClick={copy} title="Copy">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Send this to anyone you trust. Each link can only be used once.
            </p>
          </div>
        )}

        <div className="border-t border-[color:var(--border)] pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            <Users size={12} /> People with access
          </div>
          {loading ? (
            <div className="text-slate-500 text-sm py-2">Loading…</div>
          ) : members.length === 0 ? (
            <div className="text-slate-500 text-sm py-2">No one else has access yet.</div>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.memberId}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full text-white text-[11px] font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #ec4899))' }}
                  >
                    {(m.memberEmail || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{m.memberEmail || m.memberId.slice(0, 8)}</div>
                    <div className="text-[11px] text-slate-500">{m.role}</div>
                  </div>
                  <button
                    className="btn-ghost p-1 text-rose-600"
                    onClick={() => revoke(m.memberId)}
                    title="Revoke access"
                  >
                    <UserMinus size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
