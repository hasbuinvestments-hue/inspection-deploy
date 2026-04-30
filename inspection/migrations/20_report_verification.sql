-- Public report verification to reduce impersonation risk from downloaded PDFs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.inspections(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inspections_verification_code
  ON public.inspections (verification_code)
  WHERE verification_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.compute_inspection_fingerprint(i public.inspections)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(concat_ws('|',
    COALESCE(i.id::TEXT, ''),
    COALESCE(i.business_id::TEXT, ''),
    COALESCE(i.inspector_id::TEXT, ''),
    COALESCE(i.inspection_date::TEXT, ''),
    COALESCE(i.approval_status::TEXT, ''),
    COALESCE(i.calculated_fee::TEXT, ''),
    COALESCE(i.payment_status::TEXT, ''),
    COALESCE(i.verification_code::TEXT, '')
  ));
$$;

CREATE OR REPLACE FUNCTION public.set_inspection_verification_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_code IS NULL OR btrim(NEW.verification_code) = '' THEN
    NEW.verification_code := upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12));
  END IF;

  IF NEW.approval_status = 'approved' THEN
    IF TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'approved' OR NEW.verification_issued_at IS NULL THEN
      NEW.verification_issued_at := COALESCE(NEW.approved_at, NOW());
    END IF;
  END IF;

  NEW.verification_fingerprint := public.compute_inspection_fingerprint(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_inspection_verification_fields ON public.inspections;
CREATE TRIGGER trg_set_inspection_verification_fields
BEFORE INSERT OR UPDATE ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.set_inspection_verification_fields();

UPDATE public.inspections AS i
SET
  verification_code = COALESCE(NULLIF(i.verification_code, ''), upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12))),
  verification_issued_at = CASE
    WHEN i.approval_status = 'approved' THEN COALESCE(i.verification_issued_at, i.approved_at, NOW())
    ELSE i.verification_issued_at
  END,
  verification_fingerprint = public.compute_inspection_fingerprint(i),
  is_current_version = COALESCE(i.is_current_version, TRUE)
WHERE
  i.verification_code IS NULL
  OR i.verification_code = ''
  OR i.verification_fingerprint IS NULL
  OR i.is_current_version IS NULL
  OR (i.approval_status = 'approved' AND i.verification_issued_at IS NULL);

CREATE OR REPLACE FUNCTION public.verify_report_public(p_code TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  report_id UUID,
  verification_code TEXT,
  business_name TEXT,
  permit_no TEXT,
  inspection_date TIMESTAMPTZ,
  approval_status TEXT,
  issued_at TIMESTAMPTZ,
  inspector_name TEXT,
  fingerprint TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    TRUE AS is_valid,
    i.id AS report_id,
    i.verification_code,
    b.business_name,
    b.permit_no,
    i.inspection_date,
    i.approval_status,
    i.verification_issued_at AS issued_at,
    i.inspector_name,
    i.verification_fingerprint AS fingerprint
  FROM public.inspections i
  LEFT JOIN public.businesses b ON b.id = i.business_id
  WHERE upper(btrim(i.verification_code)) = upper(btrim(p_code))
    AND i.approval_status = 'approved'
    AND COALESCE(i.is_draft, FALSE) = FALSE
    AND COALESCE(i.is_current_version, TRUE) = TRUE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_report_public(TEXT) TO anon, authenticated;
