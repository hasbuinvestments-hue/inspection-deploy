BEGIN;

-- 1. Ensure uuid-ossp is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add missing columns to inspections
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS gps_coordinates TEXT,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS calculation_logic JSONB;

-- 2.1 Add missing columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS staff_id TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS badge_number TEXT;


-- 3. Add verification columns if missing (from 20_report_verification.sql)
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS verification_code TEXT DEFAULT UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
ADD COLUMN IF NOT EXISTS verification_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;

-- 4. Re-create the metrics function (from 16_superadmin_metrics.sql)
CREATE OR REPLACE FUNCTION get_superadmin_metrics()
RETURNS json AS $$
DECLARE
    total_reps bigint;
    flagged_reps bigint;
    pending_reps bigint;
    user_count bigint;
    zone_count bigint;
    storage_est text;
    growth_pct numeric;
BEGIN
    SELECT count(*) INTO total_reps FROM inspections;
    SELECT count(*) INTO flagged_reps FROM inspections WHERE payment_status = 'flagged';
    SELECT count(*) INTO pending_reps FROM inspections WHERE approval_status = 'pending';
    SELECT count(*) INTO user_count FROM user_profiles;
    
    -- Count unique wards in businesses
    SELECT count(DISTINCT ward_name) INTO zone_count FROM businesses;

    growth_pct := 12.5; 
    storage_est := (total_reps * 0.15)::text || ' MB';

    RETURN json_build_object(
        'totalReports', total_reps,
        'flaggedReports', flagged_reps,
        'pendingReports', pending_reps,
        'totalUsers', user_count,
        'totalZones', zone_count,
        'dailyGrowth', growth_pct,
        'storageUtilization', storage_est,
        'uptime', '99.98%'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add any missing indexes used by metrics/scaling (from 16_scaling_support.sql)
CREATE INDEX IF NOT EXISTS idx_inspections_payment_status_date ON public.inspections (payment_status, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_approval_status ON public.inspections (approval_status);

COMMIT;
