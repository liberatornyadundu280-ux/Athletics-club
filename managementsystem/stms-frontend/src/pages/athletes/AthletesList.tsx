import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, FileUp, Plus, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardContent, EmptyState, Input, Modal, PageHeader, Select } from '@/components/ui';
import { athleteApi } from '@/services/api';
import { Athlete } from '@/types';
import { useAuth } from '@/context/AuthContext';

type ImportRow = Record<string, unknown>;
type ImportResult = { row: number; email?: string; status: 'created' | 'error'; message?: string };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim()); field = '';
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('The CSV contains an opening quote without a matching closing quote.');
  row.push(field.trim());
  if (row.some(value => value.length > 0)) rows.push(row);
  return rows;
}

function downloadTemplate() {
  const csv = 'firstName,lastName,email,phone,dateOfBirth,gender,eventSpecialization,school,grade\nAsha,Rao,asha@example.com,,2008-04-12,female,"100m sprint|long jump",,\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stms-athlete-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

const statusTone: Record<string, string> = {
  active: 'badge-success',
  injured: 'badge-amber',
  inactive: 'badge-neutral',
  transferred: 'badge-neutral',
  alumni: 'badge-neutral',
};

export function AthletesList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canWrite = hasPermission('athlete:write');
  const canImport = hasPermission('athlete:import');

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await athleteApi.getAthletes({ page, limit: 25, search: search.trim() || undefined, status: status || undefined });
      setAthletes(response.data || []);
      setTotal(response.meta?.total ?? 0);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error: any) {
      const message = error.message || 'Could not load athlete roster';
      setLoadError(message);
      toast.error(message);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { void loadAthletes(); }, [loadAthletes]);

  const readCsv = async (file?: File) => {
    setImportError('');
    setImportRows([]);
    setImportResults(null);
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose a .csv file.');
      if (file.size > 10 * 1024 * 1024) throw new Error('This CSV is larger than 10 MB. Split it into smaller files and try again.');
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('Add at least one athlete row below the header.');
      if (parsed.length > 251) throw new Error('Import up to 250 athletes at a time. Split the CSV into smaller files.');
      const headers = parsed[0].map(value => value.trim().toLowerCase().replace(/[\s_-]/g, ''));
      const required = ['firstname', 'lastname', 'email'];
      if (!required.every(header => headers.includes(header))) throw new Error('CSV headers must include firstName, lastName, and email. Download the template for the full format.');
      const rows = parsed.slice(1).map(values => {
        const raw = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
        const get = (key: string) => String(raw[key] || '').trim();
        const genderValue = get('gender').toLowerCase();
        return {
          firstName: get('firstname'),
          lastName: get('lastname'),
          email: get('email'),
          phone: get('phone') || null,
          dateOfBirth: get('dateofbirth') || null,
          gender: ['male', 'female', 'other'].includes(genderValue) ? genderValue : 'other',
          eventSpecialization: get('eventspecialization').split('|').map(event => event.trim()).filter(Boolean),
          school: get('school') || null,
          grade: get('grade') || null,
        };
      });
      setImportRows(rows);
    } catch (error: any) {
      setImportError(error.message || 'Could not read this CSV file');
    }
  };

  const submitImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const result = await athleteApi.importAthletes(importRows);
      setImportResults(result.results);
      if (result.created) toast.success(`${result.created} athlete${result.created === 1 ? '' : 's'} imported`);
      if (result.failed) toast.warning(`${result.failed} row${result.failed === 1 ? '' : 's'} need attention`);
      await loadAthletes();
    } catch (error: any) {
      toast.error(error.message || 'Could not import athletes');
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportRows([]);
    setImportResults(null);
    setImportError('');
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Athletes"
        description="Each athlete's event focus and essential details, in one club roster."
        meta={
          <>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="num text-text-secondary">{total}</span> on the roster
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="num text-text-secondary">{totalPages}</span> {totalPages === 1 ? 'page' : 'pages'}
            </span>
          </>
        }
        actions={
          <>
            {canImport && (
              <Button variant="outline" onClick={() => setImportOpen(true)} leftIcon={<FileUp className="h-4 w-4" />}>
                Import CSV
              </Button>
            )}
            {canWrite && (
              <Button onClick={() => navigate('/athletes/new')} leftIcon={<Plus className="h-4 w-4" />}>
                Add athlete
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          aria-label="Search athletes"
          placeholder="Search name, email, or school"
          value={search}
          onChange={event => { setPage(1); setSearch(event.target.value); }}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          aria-label="Filter athlete status"
          value={status}
          onChange={event => { setPage(1); setStatus(event.target.value); }}
          options={[
            { value: '', label: 'Current roster' },
            { value: 'active', label: 'Active' },
            { value: 'injured', label: 'Injured' },
            { value: 'inactive', label: 'Archived' },
            { value: 'transferred', label: 'Transferred' },
            { value: 'alumni', label: 'Alumni' },
          ]}
        />
      </div>

      <Card padding="none">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border/60" role="status" aria-label="Loading athlete roster">
              {[0, 1, 2, 3, 4].map(row => (
                <div key={row} className="flex items-center gap-3 px-4 py-4">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="The roster could not be loaded"
              description={loadError}
              action={<Button variant="outline" onClick={() => void loadAthletes()}>Try again</Button>}
            />
          ) : athletes.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title={search ? 'No athletes match this search' : 'Your roster is ready to take shape'}
              description={
                search
                  ? 'Try a shorter name, email, or school.'
                  : 'Add athletes one at a time, or bring in an existing CSV roster.'
              }
              action={
                !search && (
                  <>
                    {canWrite && (
                      <Button onClick={() => navigate('/athletes/new')} leftIcon={<Plus className="h-4 w-4" />}>
                        Add athlete
                      </Button>
                    )}
                    {canImport && (
                      <Button variant="outline" onClick={() => setImportOpen(true)} leftIcon={<FileUp className="h-4 w-4" />}>
                        Import CSV
                      </Button>
                    )}
                  </>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {athletes.map(athlete => {
                const events = athlete.eventSpecialization || [];
                return (
                  <li key={athlete.id}>
                    <button
                      onClick={() => navigate(`/athletes/${athlete.id}`)}
                      className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-volt/70"
                    >
                      <Avatar name={`${athlete.firstName} ${athlete.lastName}`} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-body-sm font-semibold text-text-primary">
                            {athlete.firstName} {athlete.lastName}
                          </span>
                          <span className={statusTone[athlete.status] || 'badge-neutral'}>{athlete.status}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-text-secondary">
                          {athlete.email}
                          {athlete.school ? ` · ${athlete.school}` : ''}
                        </span>
                        {events.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {events.slice(0, 4).map(event => (
                              <span
                                key={event}
                                className="rounded border border-border px-1.5 py-0.5 text-micro text-text-muted"
                              >
                                {event}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-volt"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && !loadError && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="num text-caption text-text-muted">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={importOpen}
        onClose={closeImport}
        title={importResults ? 'Import results' : 'Import athlete roster'}
        description="Review the rows before saving them to the active club."
        size="lg"
      >
        <div className="space-y-4">
          {!importResults && (
            <>
              <div className="rounded-radius-md border border-border bg-ink/50 p-4 text-body-sm text-text-secondary">
                <p>
                  CSV columns: firstName, lastName, email, phone, dateOfBirth, gender, eventSpecialization, school,
                  grade. Separate multiple events with a vertical bar (|).
                </p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={downloadTemplate} leftIcon={<Download className="h-4 w-4" />}>
                  Download CSV template
                </Button>
              </div>

              <label className="block cursor-pointer rounded-radius-lg border border-dashed border-volt/40 bg-volt/[0.04] p-6 text-center transition-colors hover:border-volt/70">
                <FileUp className="mx-auto h-7 w-7 text-volt" aria-hidden="true" />
                <span className="mt-2 block text-body-sm font-medium text-text-primary">Choose a CSV file</span>
                <span className="mt-1 block text-caption text-text-muted">Maximum 250 rows per import</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={event => void readCsv(event.target.files?.[0])}
                />
              </label>

              {importError && <p role="alert" className="text-body-sm text-danger-400">{importError}</p>}

              {importRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-body-sm font-medium text-text-primary">
                    Preview: <span className="num">{importRows.length}</span> rows
                  </p>
                  <div className="max-h-48 overflow-auto rounded-radius-md border border-border">
                    <table className="w-full text-left text-body-sm">
                      <thead className="sticky top-0 bg-ink/90 text-micro uppercase tracking-[0.1em] text-text-muted">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, index) => (
                          <tr className="border-t border-border" key={`${String(row.email)}-${index}`}>
                            <td className="px-3 py-2 text-text-primary">
                              {String(row.firstName || '')} {String(row.lastName || '')}
                            </td>
                            <td className="px-3 py-2 text-text-secondary">{String(row.email || '')}</td>
                            <td className="px-3 py-2 text-text-secondary">
                              {(row.eventSpecialization as string[]).join(', ') || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 5 && (
                    <p className="text-caption text-text-muted">Showing the first five rows. All rows will be checked by the server.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeImport}>Cancel</Button>
                <Button onClick={() => void submitImport()} loading={importing} disabled={!importRows.length}>
                  Import {importRows.length || ''} athletes
                </Button>
              </div>
            </>
          )}

          {importResults && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-radius-md border border-success-500/30 bg-success-500/[0.06] p-4">
                  <p className="num text-2xl font-semibold text-text-primary">
                    {importResults.filter(item => item.status === 'created').length}
                  </p>
                  <p className="text-body-sm text-text-secondary">Imported</p>
                </div>
                <div className="rounded-radius-md border border-amber-500/30 bg-amber-500/[0.06] p-4">
                  <p className="num text-2xl font-semibold text-text-primary">
                    {importResults.filter(item => item.status === 'error').length}
                  </p>
                  <p className="text-body-sm text-text-secondary">Needs attention</p>
                </div>
              </div>

              {importResults.some(item => item.status === 'error') && (
                <div
                  className="max-h-64 space-y-2 overflow-y-auto rounded-radius-md border border-border p-3"
                  aria-label="Rows that need attention"
                >
                  {importResults.filter(item => item.status === 'error').map(item => (
                    <p key={item.row} className="text-body-sm text-text-secondary">
                      <span className="font-medium text-amber-400">Row {item.row}</span> · {item.email || 'Missing email'} — {item.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={closeImport}>Done</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
