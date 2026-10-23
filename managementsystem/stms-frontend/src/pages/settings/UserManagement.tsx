import React, { useCallback, useEffect, useState } from 'react';
import { Clipboard, MailPlus, Search, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardContent, ConfirmModal, EmptyState, Input, Modal, PageHeader, Select, Stat } from '@/components/ui';
import { userApi } from '@/services/api';
import { User, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { EnrollmentRequestsPanel } from './EnrollmentRequestsPanel';

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
    <div className="page-shell">
      <PageHeader
        title="Club members"
        description="Manage club access and keep coaches and athletes moving together."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{loading ? '—' : total}</span> people with access
          </span>
        }
        actions={
          canInvite && (
            <Button onClick={() => setInviteOpen(true)} leftIcon={<MailPlus className="h-4 w-4" />}>
              Invite a member
            </Button>
          )
        }
      />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Club member counts">
        <Stat label="Roster size" value={loading ? '—' : total} hint="accounts in this club" icon={<Users className="h-4 w-4" />} />
        <Stat label="Coaching team" value={loading ? '—' : coachTotal} hint="coaches and admins" icon={<Shield className="h-4 w-4" />} tone="volt" />
        <Stat label="Athletes" value={loading ? '—' : athleteTotal} hint="athlete accounts" icon={<Users className="h-4 w-4" />} />
      </section>

      <EnrollmentRequestsPanel />

      <Card padding="none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">Members</h2>
              <p className="mt-0.5 text-caption text-text-secondary">Role changes are saved to the account and Firebase claims.</p>
            </div>
            <div className="w-full sm:max-w-xs">
              <Input
                aria-label="Search members"
                placeholder="Search name or email"
                value={search}
                onChange={event => { setPage(1); setSearch(event.target.value); }}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-border/60" role="status" aria-label="Loading club members">
              {[0, 1, 2, 3].map(row => (
                <div key={row} className="flex items-center gap-3 px-4 py-4">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-1/4" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title={search ? 'No members match this search' : 'Your roster is ready for its first teammate'}
              description={search ? 'Try a shorter name or email.' : 'Invite your coaching staff or athletes to get started.'}
              action={
                !search && canInvite && (
                  <Button onClick={() => setInviteOpen(true)} leftIcon={<MailPlus className="h-4 w-4" />}>
                    Invite a member
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[660px]">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(member => {
                    const self = member.firebaseUid === currentUser?.firebaseUid;
                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={member.name} src={member.avatarUrl || undefined} size="sm" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate font-medium text-text-primary">
                                {member.name}
                                {self && <span className="badge-primary">You</span>}
                              </p>
                              <p className="truncate text-caption text-text-secondary">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {canChangeRole && !self ? (
                            <Select
                              aria-label={`Role for ${member.name}`}
                              value={member.role}
                              onChange={event => void updateRole(member, event.target.value as UserRole)}
                              options={roleOptions}
                              className="w-[150px]"
                            />
                          ) : (
                            <span className="text-body-sm capitalize text-text-secondary">{member.role.replace('_', ' ')}</span>
                          )}
                        </td>
                        <td>
                          <span className={member.status === 'active' ? 'badge-success' : 'badge-neutral'}>{member.status}</span>
                        </td>
                        <td className="num text-caption text-text-secondary">{new Date(member.createdAt).toLocaleDateString()}</td>
                        <td className="text-right">
                          {canDelete && !self && (
                            <Button variant="ghost" size="sm" aria-label={`Deactivate ${member.name}`} onClick={() => setDeleteTarget(member)}>
                              Deactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="num text-caption text-text-muted">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a teammate" description="Create a one-time invitation link for this club." size="sm">
        <form onSubmit={invite} className="space-y-4">
          <Input label="Email address" type="email" required autoComplete="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" />
          <Select label="Club role" value={inviteRole} onChange={event => setInviteRole(event.target.value)} options={roleOptions} />
          <p className="text-caption text-text-muted">The current API creates a shareable invite link; email delivery is not configured yet.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} leftIcon={<Clipboard className="h-4 w-4" />}>Create invite link</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(createdInviteLink)} onClose={() => setCreatedInviteLink('')} title="Invitation link ready" description={`Share this link with ${createdInviteEmail || 'the invited member'}. It expires in seven days.`} size="md">
        <div className="space-y-4">
          <Input label="Secure invitation link" readOnly value={createdInviteLink} onFocus={event => event.currentTarget.select()} />
          <p className="text-body-sm text-text-secondary">The invited person must sign in with the email address you entered before accepting.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreatedInviteLink('')}>Close</Button>
            <Button onClick={async () => { try { await navigator.clipboard.writeText(createdInviteLink); toast.success('Link copied'); } catch { toast.error('Clipboard access is unavailable. Select and copy the link.'); } }} leftIcon={<Clipboard className="h-4 w-4" />}>
              Copy link
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => void removeMember()} title="Deactivate this account?" message={`${deleteTarget?.name} will lose access to STMS and their account details will be anonymized. This action can’t be undone.`} confirmText="Deactivate account" loading={deleteLoading} />
    </div>
  );
}
