import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, FileUp, Plus, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, Badge, Button, Card, CardContent, Input, Modal, Select } from '@/components/ui';
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
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('Add at least one athlete row below the header.');
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
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-400">ATHLETE DIRECTORY</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Build your roster</h1>
            <p className="mt-2 max-w-xl text-text-secondary">Keep each athlete’s event focus and essential details in one club roster.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canImport && <Button variant="outline" onClick={() => setImportOpen(true)} leftIcon={<FileUp className="h-4 w-4" />}>Import CSV</Button>}
            {canWrite && <Button onClick={() => navigate('/athletes/new')} leftIcon={<Plus className="h-4 w-4" />}>Add athlete</Button>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Input aria-label="Search athletes" placeholder="Search name, email, or school" value={search} onChange={event => { setPage(1); setSearch(event.target.value); }} leftIcon={<Search className="h-4 w-4" />} />
        <Select aria-label="Filter athlete status" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }} options={[{ value: '', label: 'Current roster' }, { value: 'active', label: 'Active' }, { value: 'injured', label: 'Injured' }, { value: 'inactive', label: 'Archived' }, { value: 'transferred', label: 'Transferred' }, { value: 'alumni', label: 'Alumni' }]} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div><h2 className="font-semibold text-text-primary">Club athletes</h2><p className="mt-1 text-sm text-text-secondary">{loading ? 'Loading roster…' : `${total} athlete${total === 1 ? '' : 's'} in this view`}</p></div>
          </div>
          {loading ? <div className="py-16 text-center text-text-secondary" role="status">Loading athlete roster…</div> : loadError ? (
            <div className="px-6 py-16 text-center"><p role="alert" className="font-medium text-text-primary">The roster could not be loaded</p><p className="mt-2 text-sm text-text-secondary">{loadError}</p><Button className="mt-5" variant="outline" onClick={() => void loadAthletes()}>Try again</Button></div>
          ) : athletes.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-text-muted" />
              <h3 className="mt-4 font-semibold text-text-primary">{search ? 'No athletes match this search' : 'Your roster is ready to take shape'}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{search ? 'Try a shorter name, email, or school.' : 'Add athletes one at a time or bring in an existing CSV roster.'}</p>
              {!search && <div className="mt-5 flex justify-center gap-2">{canWrite && <Button onClick={() => navigate('/athletes/new')} leftIcon={<Plus className="h-4 w-4" />}>Add athlete</Button>}{canImport && <Button variant="outline" onClick={() => setImportOpen(true)} leftIcon={<FileUp className="h-4 w-4" />}>Import CSV</Button>}</div>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {athletes.map(athlete => (
                <button key={athlete.id} onClick={() => navigate(`/athletes/${athlete.id}`)} className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-cold-800/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sky-400 sm:px-6">
                  <Avatar name={`${athlete.firstName} ${athlete.lastName}`} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-text-primary">{athlete.firstName} {athlete.lastName}</span><Badge variant={athlete.status === 'active' ? 'success' : athlete.status === 'injured' ? 'amber' : 'neutral'}>{athlete.status}</Badge></span>
                    <span className="mt-1 block truncate text-sm text-text-secondary">{athlete.email}{athlete.school ? ` · ${athlete.school}` : ''}</span>
                    <span className="mt-1 block truncate text-xs text-text-muted">{athlete.eventSpecialization?.length ? athlete.eventSpecialization.join(' · ') : 'Events not set'}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-sky-400" />
                </button>
              ))}
            </div>
          )}
          {!loading && totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-6"><p className="text-sm text-text-secondary">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>}
        </CardContent>
      </Card>

      <Modal isOpen={importOpen} onClose={closeImport} title={importResults ? 'Import results' : 'Import athlete roster'} description="Review the rows before saving them to the active club." size="lg">
        <div className="space-y-4">
          {!importResults && <>
            <div className="rounded-xl border border-border bg-cold-900/50 p-4 text-sm text-text-secondary"><p>CSV columns: firstName, lastName, email, phone, dateOfBirth, gender, eventSpecialization, school, grade. Separate multiple events with a vertical bar (|).</p><Button variant="ghost" size="sm" className="mt-3" onClick={downloadTemplate} leftIcon={<Download className="h-4 w-4" />}>Download CSV template</Button></div>
            <label className="block rounded-xl border border-dashed border-sky-400/50 bg-sky-500/5 p-6 text-center">
              <FileUp className="mx-auto h-7 w-7 text-sky-400" />
              <span className="mt-2 block text-sm font-medium text-text-primary">Choose a CSV file</span>
              <span className="mt-1 block text-xs text-text-muted">Maximum 250 rows per import</span>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={event => void readCsv(event.target.files?.[0])} />
            </label>
            {importError && <p role="alert" className="text-sm text-danger-400">{importError}</p>}
            {importRows.length > 0 && <div className="space-y-2"><p className="text-sm font-medium text-text-primary">Preview: {importRows.length} rows</p><div className="max-h-48 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-cold-900 text-text-muted"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Events</th></tr></thead><tbody>{importRows.slice(0, 5).map((row, index) => <tr className="border-t border-border" key={`${String(row.email)}-${index}`}><td className="px-3 py-2 text-text-primary">{String(row.firstName || '')} {String(row.lastName || '')}</td><td className="px-3 py-2 text-text-secondary">{String(row.email || '')}</td><td className="px-3 py-2 text-text-secondary">{(row.eventSpecialization as string[]).join(', ') || '—'}</td></tr>)}</tbody></table></div>{importRows.length > 5 && <p className="text-xs text-text-muted">Showing the first five rows. All rows will be checked by the server.</p>}</div>}
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeImport}>Cancel</Button><Button onClick={() => void submitImport()} loading={importing} disabled={!importRows.length}>Import {importRows.length || ''} athletes</Button></div>
          </>}
          {importResults && <>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4"><p className="text-2xl font-bold text-text-primary">{importResults.filter(item => item.status === 'created').length}</p><p className="text-sm text-text-secondary">Imported</p></div><div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-2xl font-bold text-text-primary">{importResults.filter(item => item.status === 'error').length}</p><p className="text-sm text-text-secondary">Needs attention</p></div></div>
            {importResults.some(item => item.status === 'error') && <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3" aria-label="Rows that need attention">{importResults.filter(item => item.status === 'error').map(item => <p key={item.row} className="text-sm text-text-secondary"><span className="font-medium text-amber-300">Row {item.row}</span> · {item.email || 'Missing email'} — {item.message}</p>)}</div>}
            <div className="flex justify-end"><Button onClick={closeImport}>Done</Button></div>
          </>}
        </div>
      </Modal>
    </div>
  );
}
