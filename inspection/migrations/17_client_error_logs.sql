CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.client_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'error',
    source TEXT,
    environment TEXT NOT NULL DEFAULT 'production',
    message TEXT NOT NULL,
    error_name TEXT,
    stack TEXT,
    route TEXT,
    url TEXT,
    user_agent TEXT,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    user_role TEXT,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert client error logs" ON public.client_error_logs;
CREATE POLICY "Anyone can insert client error logs"
ON public.client_error_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view client error logs" ON public.client_error_logs;
CREATE POLICY "Super admins can view client error logs"
ON public.client_error_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role = 'super_admin'
          AND COALESCE(is_active, true) = true
    )
);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_created_at
ON public.client_error_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_source
ON public.client_error_logs (source);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_environment
ON public.client_error_logs (environment);
