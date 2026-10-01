import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { attendanceApi } from '@/services/api';

export function AttendanceCheckIn() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<{ loading: boolean; message: string; session?: string; success?: boolean }>({ loading: true, message: '' });
  useEffect(() => {
    let active = true;
    attendanceApi.checkInWithQr(token).then(result => { if (active) setState({ loading: false, message: 'You’re checked in.', session: result.session, success: true }); }).catch((error: any) => { if (active) setState({ loading: false, message: error.message || 'This check-in link could not be used.' }); });
    return () => { active = false; };
  }, [token]);
  return <div className="mx-auto max-w-lg py-10"><Card><CardContent className="p-7 text-center">{state.loading ? <><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-sky-400" role="status" /><p className="mt-4 text-text-secondary">Checking you in…</p></> : <><div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${state.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>{state.success ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}</div><h1 className="mt-4 text-xl font-semibold text-text-primary">{state.success ? 'Check-in complete' : 'Check-in unavailable'}</h1><p className="mt-2 text-text-secondary">{state.message}</p>{state.session && <p className="mt-2 text-sm font-medium text-sky-300">{state.session}</p>}<Button className="mt-6" variant="outline" onClick={() => navigate('/dashboard')}>Back to dashboard</Button></>}</CardContent></Card></div>;
}
