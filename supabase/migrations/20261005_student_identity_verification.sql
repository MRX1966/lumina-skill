CREATE TABLE IF NOT EXISTS public.student_identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  ghana_card_number TEXT NOT NULL,
  document_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  review_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT identity_verification_one_record_per_user UNIQUE (user_id),
  CONSTRAINT identity_verification_name_not_empty CHECK (length(trim(legal_name)) > 0),
  CONSTRAINT identity_verification_card_not_empty CHECK (length(trim(ghana_card_number)) > 0),
  CONSTRAINT identity_verification_document_owner CHECK (document_path LIKE user_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS student_identity_verifications_user_submitted_idx
  ON public.student_identity_verifications (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS student_identity_verifications_pending_idx
  ON public.student_identity_verifications (submitted_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.guard_identity_verification_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  latest_status TEXT;
BEGIN
  SELECT status
    INTO latest_status
    FROM public.student_identity_verifications
    WHERE user_id = NEW.user_id
    ORDER BY submitted_at DESC
    LIMIT 1;

  IF latest_status IN ('pending', 'verified') THEN
    RAISE EXCEPTION 'A verification request is already pending or has already been approved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_identity_verification_submission_trigger ON public.student_identity_verifications;
CREATE TRIGGER guard_identity_verification_submission_trigger
  BEFORE INSERT ON public.student_identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_identity_verification_submission();

ALTER TABLE public.student_identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_verifications_select_own_or_admin ON public.student_identity_verifications;
CREATE POLICY identity_verifications_select_own_or_admin
  ON public.student_identity_verifications FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS identity_verifications_insert_own ON public.student_identity_verifications;
CREATE POLICY identity_verifications_insert_own
  ON public.student_identity_verifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND review_note IS NULL
  );

DROP POLICY IF EXISTS identity_verifications_admin_update ON public.student_identity_verifications;
CREATE POLICY identity_verifications_admin_update
  ON public.student_identity_verifications FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS identity_verifications_resubmit_rejected ON public.student_identity_verifications;
CREATE POLICY identity_verifications_resubmit_rejected
  ON public.student_identity_verifications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'rejected')
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND review_note IS NULL
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('identity-documents', 'identity-documents', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS identity_documents_insert_own ON storage.objects;
CREATE POLICY identity_documents_insert_own
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'identity-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    OR (
      bucket_id = 'identity-documents'
      AND get_user_role() IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS identity_documents_select_own_or_admin ON storage.objects;
CREATE POLICY identity_documents_select_own_or_admin
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'identity-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR get_user_role() IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS identity_documents_delete_own_or_admin ON storage.objects;
CREATE POLICY identity_documents_delete_own_or_admin
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'identity-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR get_user_role() IN ('admin', 'super_admin')
    )
  );
