import { supabase } from './supabase';
import type { PlannerMember, Workspace } from '../types';

function randomToken(): string {
  // 22-char URL-safe random token.
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function createInvite(opts: {
  ownerId: string;
  ownerEmail?: string;
  role?: 'editor' | 'viewer';
  ttlDays?: number;
}): Promise<{ token: string; url: string; expiresAt: string }> {
  if (!supabase) throw new Error('Cloud sync not configured.');
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (opts.ttlDays ?? 7) * 24 * 3600 * 1000).toISOString();
  const { error } = await supabase.from('planner_invites').insert({
    token,
    owner_id: opts.ownerId,
    owner_email: opts.ownerEmail ?? null,
    role: opts.role ?? 'editor',
    expires_at: expiresAt,
  });
  if (error) throw error;
  const url = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(token)}`;
  return { token, url, expiresAt };
}

export async function acceptInvite(token: string): Promise<{
  ownerId: string;
  ownerEmail?: string;
  role: 'editor' | 'viewer';
}> {
  if (!supabase) throw new Error('Cloud sync not configured.');
  const { data, error } = await supabase.rpc('accept_planner_invite', { invite_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Invite invalid or expired.');
  return {
    ownerId: row.owner_id,
    ownerEmail: row.owner_email ?? undefined,
    role: row.role,
  };
}

export async function listWorkspaces(selfId: string, selfEmail?: string): Promise<Workspace[]> {
  if (!supabase) return [{ ownerId: selfId, ownerEmail: selfEmail, role: 'owner' }];
  const { data, error } = await supabase
    .from('planner_members')
    .select('owner_id, role, owner_email')
    .eq('member_id', selfId);
  if (error) {
    console.error('listWorkspaces', error);
    return [{ ownerId: selfId, ownerEmail: selfEmail, role: 'owner' }];
  }
  const shared: Workspace[] = (data ?? []).map((r: any) => ({
    ownerId: r.owner_id,
    ownerEmail: r.owner_email ?? undefined,
    role: r.role,
  }));
  return [{ ownerId: selfId, ownerEmail: selfEmail, role: 'owner' }, ...shared];
}

export async function listMembers(ownerId: string): Promise<PlannerMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('planner_members')
    .select('*')
    .eq('owner_id', ownerId);
  if (error) {
    console.error('listMembers', error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    ownerId: r.owner_id,
    memberId: r.member_id,
    ownerEmail: r.owner_email ?? undefined,
    memberEmail: r.member_email ?? undefined,
    role: r.role,
    createdAt: r.created_at,
  }));
}

export async function revokeMember(ownerId: string, memberId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('planner_members')
    .delete()
    .eq('owner_id', ownerId)
    .eq('member_id', memberId);
  if (error) throw error;
}

export async function leaveSharedPlanner(ownerId: string, selfId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('planner_members')
    .delete()
    .eq('owner_id', ownerId)
    .eq('member_id', selfId);
  if (error) throw error;
}

export function readInviteFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('invite');
}

export function clearInviteFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.toString());
}
