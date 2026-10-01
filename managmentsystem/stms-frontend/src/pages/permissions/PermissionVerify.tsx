import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Card, CardContent } from '@/components/ui';
import { permissionApi } from '@/services/api';

export function PermissionVerify() {
  const { token = '' } = useParams(); const [record, setRecord] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let active = true; permissionApi.verifyLetter(token).then(value => { if (active) setRecord(value); }).catch((cause: any) => { if (active) setError(cause.message || 'This verification link is invalid.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [token]);
  return <div className="mx-auto max-w-lg py-12"><Card><CardContent className="p-7 text-center"><p className="text-sm font-semibold text-sky-400">STMS LETTER VERIFICATION</p>{loading ? <p role="status" className="mt-5 text-text-secondary">Checking verification status…</p> : error ? <><h1 className="mt-4 text-xl font-semibold text-text-primary">Could not verify this letter</h1><p role="alert" className="mt-2 text-sm text-text-secondary">{error}</p></> : <><h1 className="mt-4 text-xl font-semibold text-text-primary">Permission letter status</h1><p className="mt-2 text-text-secondary">{record.event}{record.date ? ` · ${record.date}` : ''}</p><p className="mt-1 text-sm text-text-secondary">{String(record.type).replace('_', ' ')}</p><Badge className="mt-4" variant={record.status === 'approved' ? 'success' : record.status === 'rejected' ? 'danger' : 'neutral'}>{record.status}</Badge></>}</CardContent></Card></div>;
}
