import React, { useCallback, useEffect, useState } from 'react';
import { Clipboard, MailPlus, Search, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Badge, Button, Card, CardContent, ConfirmModal, Input, Modal, Select } from '@/components/ui';
import { userApi } from '@/services/api';
import { User, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';

const roleOptions = [
  { value: 'club_admin', label: 'Club admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'athlete', label: 'Athlete' },
];

export function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [coachTotal, setCoachTotal] = useState(0);
  const [athleteTotal, setAthleteTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [createdInviteEmail, setCreatedInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('athlete');
  const [createdInviteLink, setCreatedInviteLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [response, coaches, athletes] = await Promise.all([
        userApi.getUsers({ page, limit: 25, search: search.trim() || undefined }),
        userApi.getUsers({ page: 1, limit: 1, role: 'coach' }),
        userApi.getUsers({ page: 1, limit: 1, role: 'athlete' }),
      ]);
      setUsers(response.data || []);
      setTotal(response.meta?.total ?? response.data?.length ?? 0);
      setTotalPages(response.meta?.totalPages ?? 1);
      setCoachTotal(coaches.meta?.total ?? 0);
      setAthleteTotal(athletes.meta?.total ?? 0);
    } catch (error: any) {
      toast.error(error.message || 'Could not load club members');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const updateRole = async (member: User, role: UserRole) => {
    try {
      const updated = await userApi.updateUserRole(member.id, role);
      setUsers(items => items.map(item => item.id === member.id ? { ...item, ...updated } : item));
      toast.success(`${member.name}'s role updated`);
    } catch (error: any) {
      toast.error(error.message || 'Could not update role');
    }
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await userApi.inviteUser({ email: inviteEmail.trim(), role: inviteRole });
      setInviteOpen(false);
      setCreatedInviteEmail(inviteEmail.trim());
      setInviteEmail('');
      setCreatedInviteLink(result.magicLink || '');
      toast.success('Invitation link created');
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Could not create invitation');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await userApi.deleteUser(deleteTarget.id);
      setUsers(items => items.filter(item => item.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name}'s account was deactivated`);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || 'Could not remove member');
    } finally {
      setDeleteLoading(false);
    }
  };

  const canInvite = hasPermission('user:invite');
  const canChangeRole = hasPermission('user:role');
  const canDelete = hasPermission('user:delete');

  return (
    <div className="space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-400">CLUB ROSTER</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">People behind the progress</h1>
            <p className="mt-2 max-w-xl text-text-secondary">Manage club access and keep coaches and athletes moving together.</p>
          </div>
          {canInvite && <Button onClick={() => setInviteOpen(true)} leftIcon={<MailPlus className="h-4 w-4" />}>Invite a member</Button>}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 p-5"><Users className="h-8 w-8 text-sky-400" /><div><p className="text-sm text-text-secondary">Roster size</p><p className="text-2xl font-bold text-text-primary">{loading ? '—' : total}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><Shield className="h-8 w-8 text-amber-400" /><div><p className="text-sm text-text-secondary">Coaching team</p><p className="text-2xl font-bold text-text-primary">{loading ? '—' : coachTotal}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><Users className="h-8 w-8 text-text-muted" /><div><p className="text-sm text-text-secondary">Athletes</p><p className="text-2xl font-bold text-text-primary">{loading ? '—' : athleteTotal}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-semibold text-text-primary">Club members</h2><p className="mt-1 text-sm text-text-secondary">Role changes are saved to their account and Firebase claims.</p></div>
            <div className="w-full sm:max-w-xs"><Input aria-label="Search members" placeholder="Search name or email" value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} leftIcon={<Search className="h-4 w-4" />} /></div>
          </div>

          {loading ? <div className="py-14 text-center text-text-secondary" role="status">Loading club roster…</div> : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <Users className="mx-auto h-9 w-9 text-text-muted" />
              <h3 className="mt-3 font-semibold text-text-primary">Your roster is ready for its first teammate</h3>
              <p className="mt-1 text-sm text-text-secondary">Invite your coaching staff or athletes to get started.</p>
              {canInvite && <Button className="mt-5" onClick={() => setInviteOpen(true)} leftIcon={<MailPlus className="h-4 w-4" />}>Invite a member</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="px-3 py-3 font-medium">Member</th><th className="px-3 py-3 font-medium">Role</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Joined</th><th className="px-3 py-3 text-right font-medium">Actions</th></tr></thead>
                <tbody>{users.map(member => {
                  const self = member.firebaseUid === currentUser?.firebaseUid;
                  return <tr key={member.id} className="border-b border-border/70 last:border-0 hover:bg-cold-800/30">
                    <td className="px-3 py-4"><div className="flex items-center gap-3"><Avatar name={member.name} src={member.avatarUrl || undefined} size="sm" /><div><p className="font-medium text-text-primary">{member.name}{self && <span className="ml-2 text-xs text-sky-400">You</span>}</p><p className="text-sm text-text-secondary">{member.email}</p></div></div></td>
                    <td className="px-3 py-4">{canChangeRole && !self ? <Select aria-label={`Role for ${member.name}`} value={member.role} onChange={event => void updateRole(member, event.target.value as UserRole)} options={roleOptions} /> : <span className="capitalize text-text-secondary">{member.role.replace('_', ' ')}</span>}</td>
                    <td className="px-3 py-4"><Badge variant={member.status === 'active' ? 'success' : 'neutral'}>{member.status}</Badge></td>
                    <td className="px-3 py-4 text-sm text-text-secondary">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-4 text-right">{canDelete && !self && <Button variant="ghost" size="sm" aria-label={`Deactivate ${member.name}`} onClick={() => setDeleteTarget(member)}>Deactivate</Button>}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
          {!loading && totalPages > 1 && <div className="flex items-center justify-between border-t border-border pt-4"><p className="text-sm text-text-secondary">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>Next</Button></div></div>}
        </CardContent>
      </Card>

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a teammate" description="Create a one-time invitation link for this club." size="sm">
        <form onSubmit={invite} className="space-y-4">
          <Input label="Email address" type="email" required autoComplete="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" />
          <Select label="Club role" value={inviteRole} onChange={event => setInviteRole(event.target.value)} options={roleOptions} />
          <p className="text-xs text-text-muted">The current API creates a shareable invite link; email delivery is not configured yet.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit" loading={saving} leftIcon={<Clipboard className="h-4 w-4" />}>Create invite link</Button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(createdInviteLink)} onClose={() => setCreatedInviteLink('')} title="Invitation link ready" description={`Share this link with ${createdInviteEmail || 'the invited member'}. It expires in seven days.`} size="md">
        <div className="space-y-4"><Input label="Secure invitation link" readOnly value={createdInviteLink} onFocus={event => event.currentTarget.select()} /><p className="text-sm text-text-secondary">The invited person must sign in with the email address you entered before accepting.</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreatedInviteLink('')}>Close</Button><Button onClick={async () => { try { await navigator.clipboard.writeText(createdInviteLink); toast.success('Link copied'); } catch { toast.error('Clipboard access is unavailable. Select and copy the link.'); } }} leftIcon={<Clipboard className="h-4 w-4" />}>Copy link</Button></div></div>
      </Modal>

      <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => void removeMember()} title="Deactivate this account?" message={`${deleteTarget?.name} will lose access to STMS and their account details will be anonymized. This action can’t be undone.`} confirmText="Deactivate account" loading={deleteLoading} />
    </div>
  );
}
