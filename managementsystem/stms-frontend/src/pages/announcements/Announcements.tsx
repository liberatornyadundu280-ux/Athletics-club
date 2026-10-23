import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Bell, Megaphone, Pin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, EmptyState, Input, Modal, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { announcementApi } from '@/services/api';

export function Announcements() {
  const { hasPermission } = useAuth();
  const canPublish = hasPermission('announcement:write');
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(''); const [message, setMessage] = useState(''); const [audience, setAudience] = useState<string[]>(['athlete', 'coach']); const [pinned, setPinned] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setItems(await announcementApi.get()); } catch (error: any) { toast.error(error.message || 'Could not load updates'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (item: any) => { if (item.read) return; try { await announcementApi.markRead(item.id); setItems(previous => previous.map(row => row.id === item.id ? { ...row, read: true } : row)); } catch (error: any) { toast.error(error.message || 'Could not mark this update as read'); } };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); try { await announcementApi.create({ title, message, audience, pinned }); toast.success('Update published'); setOpen(false); setTitle(''); setMessage(''); await load(); } catch (error: any) { toast.error(error.message || 'Could not publish update'); } finally { setSaving(false); } };

  const unread = items.filter(item => !item.read).length;

  return (
    <div className="page-shell">
      <PageHeader
        title="Announcements"
        description="Schedule changes and important messages shared with your club."
        meta={
          <span className="inline-flex items-baseline gap-1.5">
            <span className="num text-text-secondary">{loading ? '—' : unread}</span> unread of{' '}
            <span className="num text-text-secondary">{items.length}</span>
          </span>
        }
        actions={
          canPublish && (
            <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Publish update
            </Button>
          )
        }
      />

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading club updates">
          {[0, 1, 2].map(row => (
            <div key={row} className="surface space-y-3 p-5">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title="You're all caught up"
            description="New club messages will show up here."
            action={
              canPublish && (
                <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                  Publish update
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map(item => (
            <article
              key={item.id}
              onFocus={() => void markRead(item)}
              onMouseEnter={() => void markRead(item)}
              className={`surface relative overflow-hidden p-4 transition-colors sm:p-5 ${
                !item.read ? 'border-volt/30 bg-volt/[0.03]' : ''
              }`}
            >
              {!item.read && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-volt" />}

              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-md ${item.read ? 'bg-white/[0.04] text-text-muted' : 'bg-volt/10 text-volt'}`}>
                  <Megaphone className="h-4.5 w-4.5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-body-sm font-semibold text-text-primary sm:text-heading-sm">{item.title}</h2>
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 px-1.5 py-0.5 text-micro text-amber-400">
                        <Pin className="h-3 w-3" aria-hidden="true" /> Pinned
                      </span>
                    )}
                    {!item.read && <span className="rounded-sm bg-volt px-1.5 py-0.5 text-micro font-bold uppercase tracking-[0.08em] text-ink">New</span>}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-body-sm leading-relaxed text-text-secondary">{item.message}</p>

                  <p className="mt-3 text-caption text-text-muted">
                    <span className="num">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'Recently'}</span>
                    {' · '}For {item.audience.join(', ').replaceAll('_', ' ')}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Publish a club update"
        description="Choose the club roles that should see this message."
        size="md"
      >
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label="Title"
            required
            minLength={3}
            maxLength={160}
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
          <label className="block">
            <span className="label">Message</span>
            <textarea
              required
              minLength={3}
              maxLength={5000}
              rows={5}
              className="input"
              value={message}
              onChange={event => setMessage(event.target.value)}
            />
          </label>

          <fieldset>
            <legend className="label mb-2">Audience</legend>
            <div className="flex flex-wrap gap-1.5">
              {['athlete', 'coach', 'club_admin'].map(role => {
                const checked = audience.includes(role);
                return (
                  <label
                    key={role}
                    className={`flex cursor-pointer items-center gap-2 rounded-radius-md border px-3 py-2 text-body-sm capitalize transition-colors ${
                      checked ? 'border-volt/40 bg-volt/[0.05] text-text-primary' : 'border-border text-text-secondary hover:bg-white/[0.03]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-volt"
                      checked={checked}
                      onChange={event => setAudience(previous => event.target.checked ? [...previous, role] : previous.filter(value => value !== role))}
                    />
                    {role.replace('_', ' ')}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2 text-body-sm text-text-primary">
            <input type="checkbox" className="h-4 w-4 accent-volt" checked={pinned} onChange={event => setPinned(event.target.checked)} />
            Pin this update
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={!audience.length}>Publish</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
