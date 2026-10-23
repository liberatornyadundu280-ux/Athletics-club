import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clipboard, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, EmptyState, Input, Modal, PageHeader, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { athleteApi, permissionApi } from '@/services/api';

const today = () => new Date().toISOString().slice(0, 10);
const letterTypes = [{ value: 'hod', label: 'HOD permission' }, { value: 'faculty', label: 'Faculty permission' }, { value: 'hostel', label: 'Hostel permission' }, { value: 'competition', label: 'Competition participation' }, { value: 'travel', label: 'Travel permission' }, { value: 'attendance', label: 'Attendance adjustment' }, { value: 'medical_leave', label: 'Medical leave' }, { value: 'training_camp', label: 'Training camp' }];

const letterStatusTone: Record<string, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-amber',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export function PermissionsList() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<'events' | 'letters'>('events'); const [events, setEvents] = useState<any[]>([]); const [letters, setLetters] = useState<any[]>([]); const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [eventOpen, setEventOpen] = useState(false); const [generateFor, setGenerateFor] = useState<any>(null); const [createdOpen, setCreatedOpen] = useState(false); const [createdLinks, setCreatedLinks] = useState<any[]>([]); const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', date: today(), venue: '', type: 'competition', description: '' }); const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]); const [selectedTypes, setSelectedTypes] = useState<string[]>(['competition']);
  const canWrite = hasPermission('permission:write'); const canApprove = hasPermission('permission:approve');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [eventRows, letterRows, roster] = await Promise.all([permissionApi.getEvents(), permissionApi.getLetters(), canWrite ? athleteApi.getAthletes({ limit: 100 }) : Promise.resolve(null)]); setEvents(eventRows); setLetters(letterRows); setAthletes(roster?.data || []); } catch (cause: any) { setError(cause.message || 'Could not load permission workflows'); } finally { setLoading(false); } }, [canWrite]);
  useEffect(() => { void load(); }, [load]);
  const createEvent = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const created = await permissionApi.createEvent(eventForm); toast.success('Permission event created'); setEventOpen(false); setGenerateFor(created); await load(); } catch (cause: any) { toast.error(cause.message || 'Could not create event'); } finally { setSaving(false); } };
  const generateLetters = async () => { if (!generateFor || !selectedAthletes.length || !selectedTypes.length) return; setSaving(true); try { const result = await permissionApi.generateLetters(generateFor.id, { athleteIds: selectedAthletes, types: selectedTypes }); setCreatedLinks(result.letters || []); setCreatedOpen(true); setGenerateFor(null); setSelectedAthletes([]); await load(); } catch (cause: any) { toast.error(cause.message || 'Could not generate letters'); } finally { setSaving(false); } };
  const submit = async (letter: any) => { try { await permissionApi.submitLetter(letter.id); toast.success('Letter submitted for review'); await load(); } catch (cause: any) { toast.error(cause.message || 'Could not submit letter'); } };
  const decide = async (letter: any, decision: 'approved' | 'rejected') => { try { await permissionApi.decideLetter(letter.id, decision); toast.success(`Letter ${decision}`); await load(); } catch (cause: any) { toast.error(cause.message || 'Could not review letter'); } };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Clipboard access is unavailable. Select and copy the text.'); } };
  const toggle = (values: string[], value: string, update: (next: string[]) => void) => update(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);

  const current = tab === 'events' ? events : letters;

  return (
    <div className="page-shell">
      <PageHeader
        title="Permission letters"
        description="Generate athlete-specific request letters, then track each one through submission, review and verification."
        meta={
          <>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="num text-text-secondary">{events.length}</span> events
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="num text-text-secondary">{letters.length}</span> letters
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="num text-text-secondary">{letters.filter(letter => letter.status === 'submitted').length}</span> awaiting review
            </span>
          </>
        }
        actions={
          canWrite && (
            <Button onClick={() => setEventOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Create event
            </Button>
          )
        }
      />

      <div className="-mt-1 flex gap-1 border-b border-border" role="tablist" aria-label="Permission sections">
        {(['events', 'letters'] as const).map(id => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`tab capitalize ${tab === id ? 'tab-active' : ''}`}
          >
            {id}
          </button>
        ))}
      </div>

      <Card padding="none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-heading-sm font-semibold text-text-primary">
              {tab === 'events' ? 'Permission events' : 'Generated letters'}
            </h2>
            <span className="num text-caption text-text-muted">{loading ? '—' : `${current.length} total`}</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border/60" role="status" aria-label="Loading permission records">
              {[0, 1, 2].map(row => (
                <div key={row} className="space-y-2 px-4 py-4">
                  <div className="skeleton h-3.5 w-1/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="Permission records could not be loaded"
              description={error}
              action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}
            />
          ) : tab === 'events' ? (
            events.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No permission events"
                description="Create an event to prepare permission requests for participating athletes."
                action={
                  canWrite && (
                    <Button onClick={() => setEventOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                      Create event
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {events.map(event => (
                  <li key={event.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-body-sm font-semibold text-text-primary">{event.name}</h3>
                      <p className="mt-0.5 text-caption text-text-secondary">
                        <span className="num">{event.date}</span> · {event.venue || 'Venue not set'} ·{' '}
                        <span className="capitalize">{event.type.replace('_', ' ')}</span>
                      </p>
                    </div>
                    {canWrite && (
                      <Button size="sm" variant="outline" onClick={() => setGenerateFor(event)} className="sm:shrink-0">
                        Generate letters
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : letters.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No letters generated yet"
              description="Generate letters from an event to start a permission request."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {letters.map(letter => (
                <li key={letter.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-body-sm font-semibold text-text-primary">
                        {letter.athleteName} · <span className="capitalize">{letter.templateId.replace('_', ' ')}</span>
                      </h3>
                      <p className="mt-0.5 text-caption text-text-secondary">
                        Created <span className="num">{new Date(letter.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <span className={letterStatusTone[letter.status] || 'badge-neutral'}>{letter.status.replace('_', ' ')}</span>
                  </div>

                  <details className="group mt-3">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-caption font-medium text-volt transition-colors hover:text-volt-deep">
                      <span className="transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
                      Review letter content
                    </summary>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-radius-md border border-border bg-ink/60 p-4 text-body-sm leading-relaxed text-text-secondary">
                      {letter.content}
                    </pre>
                  </details>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(letter.status === 'draft' || letter.status === 'rejected') && (
                      <Button size="sm" variant="outline" onClick={() => void submit(letter)}>
                        Submit for review
                      </Button>
                    )}
                    {canApprove && letter.status === 'submitted' && (
                      <>
                        <Button size="sm" onClick={() => void decide(letter, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => void decide(letter, 'rejected')}>
                          Return with changes
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={eventOpen}
        onClose={() => setEventOpen(false)}
        title="Create a permission event"
        description="Use one event to generate letters for a selected roster."
        size="md"
      >
        <form onSubmit={createEvent} className="space-y-4">
          <Input
            label="Event name"
            required
            value={eventForm.name}
            onChange={event => setEventForm({ ...eventForm, name: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              required
              value={eventForm.date}
              onChange={event => setEventForm({ ...eventForm, date: event.target.value })}
            />
            <Select
              label="Type"
              value={eventForm.type}
              onChange={event => setEventForm({ ...eventForm, type: event.target.value })}
              options={['competition', 'training_camp', 'travel', 'other'].map(value => ({ value, label: value.replace('_', ' ') }))}
            />
          </div>
          <Input
            label="Venue"
            value={eventForm.venue}
            onChange={event => setEventForm({ ...eventForm, venue: event.target.value })}
          />
          <label className="block">
            <span className="label">Purpose / details</span>
            <textarea
              className="input min-h-16"
              value={eventForm.description}
              onChange={event => setEventForm({ ...eventForm, description: event.target.value })}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create event</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(generateFor)}
        onClose={() => setGenerateFor(null)}
        title={`Generate letters · ${generateFor?.name || ''}`}
        description="Choose participants and one or more letter types."
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <p className="stat-label mb-2">Participants</p>
            <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {athletes.map(athlete => {
                const checked = selectedAthletes.includes(athlete.id);
                return (
                  <label
                    key={athlete.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-radius-md border p-3 text-body-sm transition-colors ${
                      checked ? 'border-volt/40 bg-volt/[0.05]' : 'border-border hover:bg-white/[0.03]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-volt"
                      checked={checked}
                      onChange={() => toggle(selectedAthletes, athlete.id, setSelectedAthletes)}
                    />
                    <span className="text-text-primary">{athlete.firstName} {athlete.lastName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="stat-label mb-2">Letter types</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {letterTypes.map(type => {
                const checked = selectedTypes.includes(type.value);
                return (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-radius-md border p-2.5 text-body-sm transition-colors ${
                      checked ? 'border-volt/40 bg-volt/[0.05] text-text-primary' : 'border-border text-text-secondary hover:bg-white/[0.03]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-volt"
                      checked={checked}
                      onChange={() => toggle(selectedTypes, type.value, setSelectedTypes)}
                    />
                    {type.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGenerateFor(null)}>Cancel</Button>
            <Button
              loading={saving}
              disabled={!selectedAthletes.length || !selectedTypes.length}
              onClick={() => void generateLetters()}
            >
              Generate {selectedAthletes.length * selectedTypes.length || ''} letters
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={createdOpen}
        onClose={() => setCreatedOpen(false)}
        title="Letters generated"
        description="Share or save these verification links now. The raw verification token is only returned once."
        size="lg"
      >
        <div className="max-h-[55vh] space-y-2 overflow-auto">
          {createdLinks.map(letter => (
            <div key={letter.id} className="rounded-radius-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-body-sm font-medium text-text-primary">
                  {letter.athleteName} · <span className="capitalize">{letter.templateId}</span>
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void copy(letter.verificationUrl)}
                  leftIcon={<Clipboard className="h-4 w-4" />}
                >
                  Copy link
                </Button>
              </div>
              <p className="num mt-2 break-all text-micro text-text-muted">{letter.verificationUrl}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => { setCreatedOpen(false); setTab('letters'); }}>
            Done <Check className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Modal>
    </div>
  );
}
