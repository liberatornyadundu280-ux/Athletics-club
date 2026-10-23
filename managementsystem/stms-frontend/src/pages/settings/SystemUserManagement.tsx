import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Search, Shield, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardContent, ConfirmModal, EmptyState, Input, Modal, PageHeader, Select, Stat } from '@/components/ui';
import { clubApi, userApi } from '@/services/api';
import { Club, User } from '@/types';
import { useAuth } from '@/context/AuthContext';

const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'system_admin', label: 'System admin' },
  { value: 'club_admin', label: 'Club admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'athlete', label: 'Athlete' },
];

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'deleted', label: 'Deleted' },
];

interface PlatformClub extends Club {
  hasAccess: boolean;
}

export function SystemUserManagement() {
  const navigate = useNavigate();
  const { user: currentUser, switchClub } = useAuth();
  const [clubs, setClubs] = useState<PlatformClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [activatingClubId, setActivatingClubId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createClubOpen, setCreateClubOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubSlug, setNewClubSlug] = useState('');
  const [creatingClub, setCreatingClub] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.getPlatformUsers({
        page, limit: 25, search: search.trim() || undefined,
        role: role || undefined, status: status || undefined,
      });
      setUsers(response.data || []);
      setTotal(response.meta?.total ?? 0);
      setTotalPages(response.meta?.totalPages ?? 1);
    } catch (error: any) {
      toast.error(error.message || 'Could not load platform accounts');
    } finally {
      setLoading(false);
    }
  }, [page, role, search, status]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const loadClubs = useCallback(async () => {
    setClubsLoading(true);
    try {
      setClubs(await clubApi.getPlatformClubs());
    } catch (error: any) {
      toast.error(error.message || 'Could not load platform clubs');
    } finally {
      setClubsLoading(false);
    }
  }, []);

  useEffect(() => { void loadClubs(); }, [loadClubs]);

  const openClubRoster = async (club: PlatformClub) => {
    setActivatingClubId(club.id);
    try {
      // Idempotently ensure both the membership and the user's clubIds entry
      // exist, including for legacy records with incomplete club metadata.
      await clubApi.addMyPlatformClubAccess(club.id);
      await switchClub(club.id);
      toast.success(club.hasAccess ? `Switched to ${club.name}` : `Admin access enabled for ${club.name}`);
      navigate('/settings/users');
    } catch (error: any) {
      toast.error(error.message || `Could not activate access to ${club.name}`);
    } finally {
      setActivatingClubId(null);
    }
  };

  const createClub = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingClub(true);
    try {
      await clubApi.createClub({ name: newClubName.trim(), slug: newClubSlug.trim() || undefined });
      setCreateClubOpen(false);
      setNewClubName('');
      setNewClubSlug('');
      await loadClubs();
      toast.success('Club created and your head-coach access is active');
    } catch (error: any) {
      toast.error(error.message || 'Could not create club');
    } finally {
      setCreatingClub(false);
    }
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userApi.permanentlyDeletePlatformUser(deleteTarget.id);
      setUsers(items => items.filter(item => item.id !== deleteTarget.id));
      setTotal(value => Math.max(0, value - 1));
      toast.success(`${deleteTarget.email} was deleted from Firebase and STMS`);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || 'Account deletion did not complete. Retry or contact support.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Account control center"
        description="Search every STMS account and permanently remove an account from Firebase Authentication and the STMS database."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{loading ? '—' : total}</span> accounts matching filters
          </span>
        }
      />

      <section className="grid gap-3 sm:max-w-xs" aria-label="Platform account count">
        <Stat label="Accounts matching filters" value={loading ? '—' : total} hint="across every club" icon={<Users className="h-4 w-4" />} tone="volt" />
      </section>

      <Card padding="none">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">Club directory</h2>
              <p className="mt-0.5 text-caption text-text-secondary">Create a club or attach your system-admin account to an existing club to open its roster.</p>
            </div>
            <Button onClick={() => setCreateClubOpen(true)} leftIcon={<Building2 className="h-4 w-4" />}>Create a club</Button>
          </div>
          {clubsLoading ? <p className="py-8 text-center text-body-sm text-text-secondary" role="status">Loading clubs…</p> : clubs.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="No clubs found in this database"
              description="If you expected seeded clubs, check that the backend is connected to the same MongoDB database where they were created."
            />
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">
              {clubs.map(club => (
                <div key={club.id} className="flex flex-col gap-4 rounded-radius-md border border-border bg-ink/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-md"
                      style={{ backgroundColor: `${club.branding?.primaryColor || '#D8FF3E'}26`, color: club.branding?.primaryColor || '#D8FF3E' }}
                    >
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-text-primary">{club.name}</p>
                      <p className="num truncate text-caption text-text-muted">{club.slug}</p>
                      <p className="mt-0.5 text-micro text-text-muted">{club.hasAccess ? 'Admin access active' : 'Not attached to your account'}</p>
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0" loading={activatingClubId === club.id} disabled={Boolean(activatingClubId)} onClick={() => void openClubRoster(club)}>
                    {club.hasAccess ? 'Manage users' : 'Add my access'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={createClubOpen} onClose={() => setCreateClubOpen(false)} title="Create a club" description="A new club starts with your system-admin account as its head coach." size="sm">
        <form onSubmit={createClub} className="space-y-4"><Input label="Club name" required minLength={2} maxLength={100} value={newClubName} onChange={event => setNewClubName(event.target.value)} placeholder="Aditya Athletics" /><Input label="URL slug" maxLength={50} pattern="[a-z0-9-]+" value={newClubSlug} onChange={event => setNewClubSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} hint="Optional. Use lowercase letters, numbers, and hyphens." /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setCreateClubOpen(false)}>Cancel</Button><Button type="submit" loading={creatingClub} disabled={newClubName.trim().length < 2}>Create club</Button></div></form>
      </Modal>

      <Card padding="none">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-heading-sm font-semibold text-text-primary">All platform accounts</h2>
              <p className="mt-0.5 text-caption text-text-secondary">System administrators cannot delete their own account from this screen.</p>
            </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[680px]">
            <Input aria-label="Search platform accounts" placeholder="Search name, email, or UID" value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} leftIcon={<Search className="h-4 w-4" />} />
            <Select aria-label="Filter by role" value={role} onChange={event => { setPage(1); setRole(event.target.value); }} options={roleOptions} />
            <Select aria-label="Filter by status" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }} options={statusOptions} />
          </div>
        </div>

        <div className="rounded-radius-md border border-amber-500/30 bg-amber-500/[0.05] p-3.5">
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <p className="text-body-sm leading-relaxed text-text-secondary">Permanent deletion removes the Firebase identity, MongoDB user record, club memberships, pending invitations, and refresh sessions. Historical audit events are retained without the account profile for accountability.</p>
          </div>
        </div>

        {loading ? <p className="py-14 text-center text-text-secondary" role="status">Loading platform accounts…</p> : users.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-5 w-5" />}
            title="No accounts match these filters"
            description="Try a different search term or clear a filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Clubs</th>
                  <th>Last active</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} src={member.avatarUrl || undefined} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{member.name}</p>
                          <p className="truncate text-caption text-text-secondary">{member.email}</p>
                          <p className="num mt-0.5 truncate text-micro text-text-muted">UID {member.firebaseUid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="capitalize text-text-secondary">{member.role.replace('_', ' ')}</td>
                    <td><span className={member.status === 'active' ? 'badge-success' : 'badge-neutral'}>{member.status}</span></td>
                    <td className="num text-text-secondary">{member.clubIds?.length || 0}</td>
                    <td className="num text-caption text-text-secondary">{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td className="text-right">
                      {member.firebaseUid === currentUser?.firebaseUid ? (
                        <span className="text-micro text-text-muted">You</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-400 hover:text-danger-300"
                          aria-label={`Permanently delete ${member.email}`}
                          onClick={() => setDeleteTarget(member)}
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && <div className="flex items-center justify-between border-t border-border pt-4"><p className="num text-caption text-text-muted">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>}
      </CardContent></Card>

      <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => void deleteAccount()} title="Permanently delete this account?" message={`This will permanently delete ${deleteTarget?.email || 'this account'} from Firebase and MongoDB, remove their club memberships and pending invitations, and revoke refresh sessions. This cannot be undone.`} confirmText="Delete permanently" loading={deleting} />
    </div>
  );
}
