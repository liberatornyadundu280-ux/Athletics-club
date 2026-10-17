import React, { useEffect, useState } from 'react';
import { ArrowLeft, Archive, BadgeCheck, CalendarDays, Mail, MapPin, Pencil, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, Badge, Button, Card, CardContent, ConfirmModal, Input, Select, Textarea } from '@/components/ui';
import { athleteApi } from '@/services/api';
import { Athlete, AthleteStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

type AthleteForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Athlete['gender'];
  eventSpecialization: string;
  medicalNotes: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
  school: string;
  grade: string;
  status: AthleteStatus;
};

const emptyForm: AthleteForm = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: 'other',
  eventSpecialization: '', medicalNotes: '', emergencyName: '', emergencyRelationship: '',
  emergencyPhone: '', emergencyEmail: '', school: '', grade: '', status: 'active',
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'injured', label: 'Injured' },
  { value: 'inactive', label: 'Archived' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'alumni', label: 'Alumni' },
];

function toForm(athlete: Athlete): AthleteForm {
  return {
    firstName: athlete.firstName || '', lastName: athlete.lastName || '', email: athlete.email || '',
    phone: athlete.phone || '', dateOfBirth: athlete.dateOfBirth || '', gender: athlete.gender || 'other',
    eventSpecialization: (athlete.eventSpecialization || []).join(', '), medicalNotes: athlete.medicalNotes || '',
    emergencyName: athlete.emergencyContact?.name || '', emergencyRelationship: athlete.emergencyContact?.relationship || '',
    emergencyPhone: athlete.emergencyContact?.phone || '', emergencyEmail: athlete.emergencyContact?.email || '',
    school: athlete.school || '', grade: athlete.grade || '', status: athlete.status || 'active',
  };
}

export function AthleteDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [form, setForm] = useState<AthleteForm>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(isNew);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const canWrite = hasPermission('athlete:write');

  useEffect(() => {
    if (isNew || !id) return;
    let active = true;
    setLoading(true);
    athleteApi.getAthlete(id).then(data => {
      if (!active) return;
      setAthlete(data);
      setForm(toForm(data));
    }).catch((error: any) => {
      if (active) toast.error(error.message || 'Could not load athlete profile');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isNew]);

  const updateField = <K extends keyof AthleteForm>(key: K, value: AthleteForm[K]) => setForm(current => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const emergencyProvided = [form.emergencyName, form.emergencyRelationship, form.emergencyPhone, form.emergencyEmail].some(value => value.trim());
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      eventSpecialization: form.eventSpecialization.split(/[,|]/).map(value => value.trim()).filter(Boolean),
      medicalNotes: form.medicalNotes.trim() || null,
      emergencyContact: emergencyProvided ? {
        name: form.emergencyName.trim(),
        relationship: form.emergencyRelationship.trim(),
        phone: form.emergencyPhone.trim(),
        email: form.emergencyEmail.trim() || null,
      } : null,
      school: form.school.trim() || null,
      grade: form.grade.trim() || null,
      status: form.status,
    };
    try {
      const saved = isNew ? await athleteApi.createAthlete(payload) : await athleteApi.updateAthlete(id!, payload);
      setAthlete(saved);
      setForm(toForm(saved));
      setEditing(false);
      toast.success(isNew ? 'Athlete added to the roster' : 'Athlete profile saved');
      if (isNew) navigate(`/athletes/${saved.id}`, { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Could not save athlete profile');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!athlete) return;
    setArchiving(true);
    try {
      await athleteApi.archiveAthlete(athlete.id);
      toast.success('Athlete archived. Their profile and records are retained.');
      navigate('/athletes');
    } catch (error: any) {
      toast.error(error.message || 'Could not archive athlete');
    } finally {
      setArchiving(false);
      setConfirmArchive(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-text-secondary" role="status">Loading athlete profile…</div>;
  if (!isNew && !athlete) return <div className="mx-auto max-w-3xl py-16 text-center"><h1 className="text-xl font-semibold text-text-primary">Athlete profile unavailable</h1><p className="mt-2 text-text-secondary">This record may have been archived or may belong to another club.</p><Button className="mt-5" variant="outline" onClick={() => navigate('/athletes')}>Return to roster</Button></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/athletes')} leftIcon={<ArrowLeft className="h-4 w-4" />}>Athlete roster</Button>
      <section className="surface-raised relative overflow-hidden p-6 sm:p-8">
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {isNew ? <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300"><UserRound className="h-8 w-8" /></div> : <Avatar size="xl" name={`${athlete?.firstName} ${athlete?.lastName}`} />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-400">ATHLETE PROFILE</p>
            <h1 className="mt-1 truncate text-3xl font-bold text-text-primary">{isNew ? 'Add an athlete' : `${athlete?.firstName} ${athlete?.lastName}`}</h1>
            <p className="mt-1 text-text-secondary">{isNew ? 'Create a roster record. An STMS login can be linked later by matching email.' : athlete?.email}</p>
          </div>
          {!isNew && athlete && <Badge variant={athlete.status === 'active' ? 'success' : athlete.status === 'injured' ? 'amber' : 'neutral'} dot>{athlete.status}</Badge>}
          {!isNew && canWrite && <div className="flex gap-2"><Button variant="outline" onClick={() => { setForm(toForm(athlete!)); setEditing(value => !value); }} leftIcon={<Pencil className="h-4 w-4" />}>{editing ? 'Cancel edit' : 'Edit profile'}</Button><Button variant="ghost" onClick={() => setConfirmArchive(true)} aria-label="Archive athlete" leftIcon={<Archive className="h-4 w-4" />}>Archive</Button></div>}
        </div>
      </section>

      {editing && canWrite ? (
        <Card><CardContent className="p-5 sm:p-7">
          <form onSubmit={save} className="space-y-6">
            <section className="space-y-4"><div><h2 className="font-semibold text-text-primary">Personal details</h2><p className="mt-1 text-sm text-text-secondary">These details identify the athlete in their club roster.</p></div><div className="grid gap-4 sm:grid-cols-2"><Input label="First name" required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={event => updateField('firstName', event.target.value)} /><Input label="Last name" required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={event => updateField('lastName', event.target.value)} /><Input label="Email address" required type="email" autoComplete="email" value={form.email} onChange={event => updateField('email', event.target.value)} hint="If this email has an active account in this club, the profile will link to it." /><Input label="Phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={event => updateField('phone', event.target.value)} /><Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={event => updateField('dateOfBirth', event.target.value)} /><Select label="Gender" value={form.gender} onChange={event => updateField('gender', event.target.value as Athlete['gender'])} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other / prefer not to say' }]} /><Input label="School or institution" value={form.school} maxLength={120} onChange={event => updateField('school', event.target.value)} /><Input label="Grade / year" value={form.grade} maxLength={40} onChange={event => updateField('grade', event.target.value)} /><Input label="Event specializations" value={form.eventSpecialization} onChange={event => updateField('eventSpecialization', event.target.value)} hint="Separate events with commas, such as 100m sprint, long jump." /><Select label="Roster status" value={form.status} onChange={event => updateField('status', event.target.value as AthleteStatus)} options={statusOptions} /></div></section>
            <section className="space-y-4 border-t border-border pt-5"><div><h2 className="font-semibold text-text-primary">Emergency contact</h2><p className="mt-1 text-sm text-text-secondary">Optional details for the club’s emergency records.</p></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Contact name" value={form.emergencyName} onChange={event => updateField('emergencyName', event.target.value)} /><Input label="Relationship" value={form.emergencyRelationship} onChange={event => updateField('emergencyRelationship', event.target.value)} /><Input label="Contact phone" type="tel" value={form.emergencyPhone} onChange={event => updateField('emergencyPhone', event.target.value)} /><Input label="Contact email" type="email" value={form.emergencyEmail} onChange={event => updateField('emergencyEmail', event.target.value)} /></div></section>
            <section className="space-y-4 border-t border-border pt-5"><div><h2 className="font-semibold text-text-primary">Coaching notes</h2><p className="mt-1 text-sm text-text-secondary">Limit medical notes to information needed for safe training.</p></div><Textarea label="Medical notes" rows={4} maxLength={2000} value={form.medicalNotes} onChange={event => updateField('medicalNotes', event.target.value)} placeholder="Relevant training restrictions or safety notes…" /></section>
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => isNew ? navigate('/athletes') : (setEditing(false), setForm(toForm(athlete!)))}>Cancel</Button><Button type="submit" loading={saving} disabled={!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()} leftIcon={<Save className="h-4 w-4" />}>{isNew ? 'Add athlete' : 'Save changes'}</Button></div>
          </form>
        </CardContent></Card>
      ) : athlete && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
          <Card><CardContent className="space-y-6 p-5 sm:p-6">
            <section><div className="mb-4 flex items-center gap-2"><UserRound className="h-4 w-4 text-sky-400" /><h2 className="font-semibold text-text-primary">Athlete details</h2></div><dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{[["Email", athlete.email], ["Phone", athlete.phone || 'Not provided'], ["Date of birth", athlete.dateOfBirth || 'Not provided'], ["Gender", athlete.gender], ["School", athlete.school || 'Not provided'], ["Grade / year", athlete.grade || 'Not provided']].map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-text-muted">{label}</dt><dd className="mt-1 text-sm text-text-primary">{value}</dd></div>)}</dl></section>
            <section className="border-t border-border pt-5"><div className="mb-3 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-amber-400" /><h2 className="font-semibold text-text-primary">Event focus</h2></div><div className="flex flex-wrap gap-2">{athlete.eventSpecialization?.length ? athlete.eventSpecialization.map(event => <Badge key={event} variant="outline">{event}</Badge>) : <span className="text-sm text-text-muted">No event specializations added.</span>}</div></section>
            {athlete.medicalNotes && <section className="border-t border-border pt-5"><h2 className="font-semibold text-text-primary">Training safety notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{athlete.medicalNotes}</p></section>}
          </CardContent></Card>
          <div className="space-y-6">
            <Card><CardContent className="space-y-4 p-5"><h2 className="font-semibold text-text-primary">Emergency contact</h2>{athlete.emergencyContact ? <><p className="text-sm text-text-primary">{athlete.emergencyContact.name} · {athlete.emergencyContact.relationship}</p><p className="flex items-center gap-2 text-sm text-text-secondary"><MapPin className="h-4 w-4" />{athlete.emergencyContact.phone}</p>{athlete.emergencyContact.email && <p className="flex items-center gap-2 text-sm text-text-secondary"><Mail className="h-4 w-4" />{athlete.emergencyContact.email}</p>}</> : <p className="text-sm text-text-muted">No emergency contact has been added.</p>}</CardContent></Card>
            <Card><CardContent className="space-y-4 p-5"><h2 className="font-semibold text-text-primary">Club account</h2><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" /><p className="text-sm text-text-secondary">{athlete.userId ? 'Linked to an active STMS account in this club.' : 'This roster profile is not linked to an STMS account yet.'}</p></div><div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-text-muted"><CalendarDays className="h-4 w-4" />Added {new Date(athlete.createdAt).toLocaleDateString()}</div></CardContent></Card>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={confirmArchive} onClose={() => setConfirmArchive(false)} onConfirm={() => void archive()} title="Archive this athlete?" message={`${athlete?.firstName} ${athlete?.lastName} will leave the current roster view. Their profile will be retained and can still be found by filtering for Archived.`} confirmText="Archive athlete" loading={archiving} />
    </div>
  );
}
