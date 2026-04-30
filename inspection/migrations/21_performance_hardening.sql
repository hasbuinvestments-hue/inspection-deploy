-- Performance hardening for high-user workloads.
-- Apply after migration 20.

-- 1) Common queue patterns for NCCG and admin report tables.
CREATE INDEX IF NOT EXISTS idx_inspections_nccg_queue
ON public.inspections (inspector_id, approval_status, is_draft, created_at DESC);

-- 2) Common finance filters (verified/unverified/overdue).
CREATE INDEX IF NOT EXISTS idx_inspections_finance_queue
ON public.inspections (payment_status, is_paid, inspection_date DESC);

-- 3) Verification lookups are code-driven; include active-state fast filter.
CREATE INDEX IF NOT EXISTS idx_inspections_verification_active
ON public.inspections (verification_code, approval_status, is_draft, is_current_version);

-- 4) Search helpers for business lookups from PHO flow.
CREATE INDEX IF NOT EXISTS idx_businesses_subcounty_trgm
ON public.businesses USING gin (lower(subcounty_name) gin_trgm_ops);

-- 5) Public verification access logs for monitoring and abuse detection.
CREATE TABLE IF NOT EXISTS public.report_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_code TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  route TEXT,
  user_agent TEXT,
  ip_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous inserts for verification logs" ON public.report_verification_logs;
CREATE POLICY "Allow anonymous inserts for verification logs"
ON public.report_verification_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can read verification logs" ON public.report_verification_logs;
CREATE POLICY "Super admins can read verification logs"
ON public.report_verification_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_report_verification_logs_created_at
ON public.report_verification_logs (created_at DESC);
