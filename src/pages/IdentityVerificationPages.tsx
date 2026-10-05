import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, IdentificationCard, ShieldCheck, UploadSimple, XCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import type { StudentIdentityVerificationRow } from '@/integrations/supabase/types';
import { getSignedUrl, uploadFile } from '@/services/storageService';
import { toast } from 'sonner';

type VerificationRecord = StudentIdentityVerificationRow;
type ReviewRecord = VerificationRecord & { studentName: string; studentEmail: string; documentUrl: string };

const statusStyles: Record<VerificationRecord['status'], string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
};

function StatusBadge({ status }: { status: VerificationRecord['status'] }) {
  const Icon = status === 'verified' ? CheckCircle : status === 'rejected' ? XCircle : Clock;
  return (
    <Badge variant="outline" className={`gap-1 capitalize ${statusStyles[status]}`}>
      <Icon size={13} /> {status}
    </Badge>
  );
}

export function IdentityVerificationPanel() {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [documentUrl, setDocumentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [consented, setConsented] = useState(false);

  const loadRecords = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sign in to view identity verification.');

    const { data, error } = await supabase
      .from('student_identity_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    const loaded = (data || []) as VerificationRecord[];
    setRecords(loaded);
    const latest = loaded[0];
    setDocumentUrl(latest ? await getSignedUrl('identity-documents', latest.document_path) : '');
  }, []);

  useEffect(() => {
    loadRecords()
      .catch((error: Error) => toast.error(error.message || 'Could not load verification status'))
      .finally(() => setLoading(false));
  }, [loadRecords]);

  const latest = records[0];
  const canSubmit = !latest || latest.status !== 'pending';

  const submitVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document) {
      toast.error('Choose a clear image of your Ghana Card.');
      return;
    }
    if (!consented) {
      toast.error('Consent is required before submitting identity information.');
      return;
    }
    if (document.size > 5_000_000) {
      toast.error('The Ghana Card image must be 5 MB or smaller.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(document.type)) {
      toast.error('Upload a JPG, PNG, or WebP image.');
      return;
    }

    setSubmitting(true);
    let uploadedPath: string | null = null;
    let submissionSaved = false;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Sign in to submit identity verification.');

      uploadedPath = `${user.id}/${crypto.randomUUID()}-${document.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      await uploadFile('identity-documents', uploadedPath, document);
      const submission = {
        user_id: user.id,
        legal_name: legalName.trim(),
        date_of_birth: dateOfBirth,
        ghana_card_number: cardNumber.trim(),
        document_path: uploadedPath,
        status: 'pending',
        review_note: null,
        reviewed_by: null,
        reviewed_at: null,
        submitted_at: new Date().toISOString(),
      };
      if (latest?.status === 'rejected') {
        const { data, error } = await supabase
          .from('student_identity_verifications')
          .update(submission)
          .eq('id', latest.id)
          .eq('status', 'rejected')
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('This request has already changed. Refresh the page and try again.');
        submissionSaved = true;
        const { error: removeError } = await supabase.storage.from('identity-documents').remove([latest.document_path]);
        if (removeError) toast.error(`Your new request was saved, but the previous document could not be removed: ${removeError.message}`);
      } else {
        const { error } = await supabase.from('student_identity_verifications').insert(submission);
        if (error) throw error;
        submissionSaved = true;
      }

      setLegalName('');
      setCardNumber('');
      setDateOfBirth('');
      setDocument(null);
      setConsented(false);
      await loadRecords();
      toast.success('Verification request submitted for manual review.');
    } catch (error) {
      if (uploadedPath && !submissionSaved) {
        const { error: cleanupError } = await supabase.storage.from('identity-documents').remove([uploadedPath]);
        if (cleanupError) toast.error(`Could not remove the unsubmitted document: ${cleanupError.message}`);
      }
      toast.error(error instanceof Error ? error.message : 'Could not submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" role="status">Loading verification status…</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Card className="overflow-hidden border-zinc-200 border-l-4 border-l-amber-400 dark:border-zinc-800">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <IdentificationCard size={22} />
                </div>
                <div>
                  <h2 className="font-semibold text-zinc-900 dark:text-white">Ghana Card Verification</h2>
                  <p className="mt-1 text-xs text-zinc-500">Manual review by an administrator</p>
                </div>
              </div>
              {latest ? <StatusBadge status={latest.status} /> : <Badge variant="outline">Not started</Badge>}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                  <Clock size={15} className="text-amber-600" /> Latest attempt
                </h3>
                <Detail label="Status" value={latest?.status ?? 'Not submitted'} />
                <Detail label="Submitted" value={latest ? new Date(latest.submitted_at).toLocaleString() : '—'} />
                <Detail label="Message" value={latest?.review_note || (latest?.status === 'pending' ? 'Your request is waiting for an administrator to review it.' : latest?.status === 'verified' ? 'Your identity was verified successfully.' : 'Submit your details and a clear card image to begin verification.')} />
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                  <ShieldCheck size={15} className="text-emerald-600" /> Basic information
                </h3>
                <Detail label="Name" value={latest?.legal_name || 'Not provided'} />
                <Detail label="Date of birth" value={latest?.date_of_birth || 'Not provided'} />
                <Detail label="Ghana Card" value={latest ? `••••••••${latest.ghana_card_number.slice(-4)}` : 'Not provided'} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {latest?.status === 'verified' ? (
        <Card className="overflow-hidden border-emerald-200 dark:border-emerald-900">
          <div className="border-b border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
            <div className="flex items-center gap-3">
              <CheckCircle size={22} className="text-emerald-600" />
              <div>
                <h2 className="font-semibold text-emerald-800 dark:text-emerald-300">Verification successful</h2>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Your identity has been reviewed by an administrator.</p>
              </div>
            </div>
          </div>
          <CardContent className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
            {documentUrl && <img src={documentUrl} alt="Submitted Ghana Card document" className="max-h-72 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700" />}
            <div>
              <p className="mb-3 border-b border-zinc-200 pb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-700">Personal identity data</p>
              <Detail label="Full name" value={latest.legal_name} />
              <Detail label="Date of birth" value={latest.date_of_birth} />
              <Detail label="Ghana Card" value={`••••••••${latest.ghana_card_number.slice(-4)}`} />
              <Detail label="Verified on" value={latest.reviewed_at ? new Date(latest.reviewed_at).toLocaleString() : '—'} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base text-zinc-900 dark:text-white">
              {latest?.status === 'pending' ? 'Verification in review' : 'Verify your identity'}
            </CardTitle>
            <p className="text-sm text-zinc-500">
              {latest?.status === 'pending'
                ? 'Your request is in the administrator review queue. You can submit again if it is declined.'
                : 'Enter the details exactly as printed on your Ghana Card. An administrator will review your request.'}
            </p>
          </CardHeader>
          {canSubmit && (
            <CardContent>
              {latest?.status === 'rejected' && (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  Previous request declined: {latest.review_note || 'Please review your details and submit again.'}
                </p>
              )}
              <form onSubmit={submitVerification} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="identity-legal-name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Full name on Ghana Card</label>
                    <Input id="identity-legal-name" required autoComplete="name" value={legalName} onChange={(event) => setLegalName(event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="identity-date-of-birth" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date of birth</label>
                    <Input id="identity-date-of-birth" type="date" required value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
                  </div>
                </div>
                <div>
                  <label htmlFor="identity-card-number" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ghana Card number</label>
                  <Input id="identity-card-number" required autoComplete="off" value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="GHA-XXXXXXXXX-X" />
                </div>
                <div>
                  <label htmlFor="identity-card-image" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ghana Card image</label>
                  <Input id="identity-card-image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setDocument(event.target.files?.[0] || null)} />
                  <p className="mt-1 text-xs text-zinc-500">JPG, PNG, or WebP; maximum 5 MB. Upload a clear image. This document is private and visible only to you and authorized administrators.</p>
                </div>
                <label className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <input type="checkbox" required checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-1 accent-emerald-600" />
                  <span>I consent to my Ghana Card details and image being stored securely for identity review by authorized administrators.</span>
                </label>
                <Button type="submit" disabled={submitting} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                  <UploadSimple size={16} /> {submitting ? 'Submitting…' : 'Submit for verification'}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      )}
    </motion.div>
  );
}

export function AdminIdentityVerificationPage() {
  const [items, setItems] = useState<ReviewRecord[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from('student_identity_verifications')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const verifications = (data || []) as VerificationRecord[];
    const userIds = [...new Set(verifications.map((item) => item.user_id))];
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;

    type StudentProfile = { user_id: string; full_name: string | null; email: string | null };
    const profileByUser = new Map<string, StudentProfile>(
      (profiles || []).map((profile: StudentProfile) => [profile.user_id, profile]),
    );
    const loaded = await Promise.all(verifications.map(async (item) => {
      const profile = profileByUser.get(item.user_id);
      return {
        ...item,
        studentName: profile?.full_name || item.legal_name,
        studentEmail: profile?.email || '',
        documentUrl: await getSignedUrl('identity-documents', item.document_path),
      };
    }));
    setItems(loaded);
  }, []);

  useEffect(() => {
    loadQueue()
      .catch((error: Error) => toast.error(error.message || 'Could not load identity requests'))
      .finally(() => setLoading(false));
  }, [loadQueue]);

  const review = async (item: ReviewRecord, status: 'verified' | 'rejected') => {
    const note = notes[item.id]?.trim() || null;
    if (status === 'rejected' && !note) {
      toast.error('Add a reason before declining a verification request.');
      return;
    }
    setSavingId(item.id);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Sign in to review identity requests.');
      const { error } = await supabase
        .from('student_identity_verifications')
        .update({
          status,
          review_note: note,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(status === 'verified' ? 'Identity verified.' : 'Verification declined.');
      await loadQueue();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save review');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" role="status">Loading verification requests…</div>;

  const pendingCount = items.filter((item) => item.status === 'pending').length;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Identity verification</h1>
        <p className="mt-1 text-sm text-zinc-500">{pendingCount} request{pendingCount === 1 ? '' : 's'} awaiting review</p>
      </div>
      {items.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="p-10 text-center text-sm text-zinc-500">No identity verification requests have been submitted.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[220px_1fr]">
                <a href={item.documentUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={item.documentUrl} alt={`Ghana Card for ${item.studentName}`} className="max-h-64 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700" />
                  <span className="mt-2 block text-center text-xs text-emerald-700">Open uploaded card</span>
                </a>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-zinc-900 dark:text-white">{item.studentName}</h2>
                      <p className="text-sm text-zinc-500">{item.studentEmail}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-900/60 sm:grid-cols-2">
                    <Detail label="Name on card" value={item.legal_name} />
                    <Detail label="Date of birth" value={item.date_of_birth} />
                    <Detail label="Ghana Card number" value={item.ghana_card_number} />
                    <Detail label="Submitted" value={new Date(item.submitted_at).toLocaleString()} />
                  </div>
                  {item.review_note && <p className="text-sm text-zinc-600 dark:text-zinc-300">Review note: {item.review_note}</p>}
                  {item.status === 'pending' && (
                    <div className="space-y-3">
                      <label htmlFor={`review-note-${item.id}`} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Review note</label>
                      <textarea id={`review-note-${item.id}`} rows={2} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Required when declining" className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={savingId === item.id} onClick={() => review(item, 'verified')} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle size={16} /> Approve</Button>
                        <Button disabled={savingId === item.id} onClick={() => review(item, 'rejected')} variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50"><XCircle size={16} /> Decline</Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 py-2 last:border-0 dark:border-zinc-800">
      <span className="shrink-0 text-xs text-zinc-500">{label}</span>
      <span className="text-right text-xs font-medium text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}
