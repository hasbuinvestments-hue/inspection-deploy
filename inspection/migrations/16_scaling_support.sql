CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id_date
ON public.inspections (inspector_id, inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_approval_status_date
ON public.inspections (approval_status, inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_payment_status_date
ON public.inspections (payment_status, inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_is_draft_date
ON public.inspections (is_draft, inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_business_id
ON public.inspections (business_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_nccg_id
ON public.user_profiles (assigned_nccg_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role_zone
ON public.user_profiles (role, zone);

CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
ON public.businesses USING gin (lower(business_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_businesses_permit_trgm
ON public.businesses USING gin (lower(permit_no) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inspections_payment_ref_trgm
ON public.inspections USING gin (lower(payment_ref) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(
    p_zone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH filtered_reports AS (
    SELECT i.*, b.business_name, b.ward_name, b.subcounty_name, b.permit_no
    FROM public.inspections i
    LEFT JOIN public.businesses b ON b.id = i.business_id
    WHERE COALESCE(p_zone, '') = ''
       OR b.ward_name = p_zone
       OR b.subcounty_name = p_zone
),
report_counts AS (
    SELECT
        COUNT(*) FILTER (
            WHERE (created_at::date = CURRENT_DATE)
               OR (inspection_date::date = CURRENT_DATE)
        ) AS today_count,
        COUNT(*) FILTER (WHERE approval_status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE approval_status = 'declined') AS declined_count,
        COUNT(*) FILTER (WHERE COALESCE(is_paid, false) = false AND status = 'completed') AS overdue_count
    FROM filtered_reports
),
pho_metrics AS (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'full_name', u.full_name,
                'zone', u.zone,
                'total', COUNT(fr.id),
                'approved', COUNT(fr.id) FILTER (WHERE fr.approval_status = 'approved'),
                'declined', COUNT(fr.id) FILTER (WHERE fr.approval_status = 'declined'),
                'pending', COUNT(fr.id) FILTER (WHERE fr.approval_status = 'pending')
            )
            ORDER BY u.full_name
        ),
        '[]'::jsonb
    ) AS data
    FROM public.user_profiles u
    LEFT JOIN filtered_reports fr ON fr.inspector_id = u.id
    WHERE u.role = 'inspector'
      AND (COALESCE(p_zone, '') = '' OR u.zone = p_zone)
),
nccg_metrics AS (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', n.id,
                'full_name', n.full_name,
                'assigned_phos', COALESCE(ap.assigned_phos, 0),
                'pending_queue', COALESCE(ap.pending_queue, 0)
            )
            ORDER BY n.full_name
        ),
        '[]'::jsonb
    ) AS data
    FROM public.user_profiles n
    LEFT JOIN (
        SELECT
            p.assigned_nccg_id AS nccg_id,
            COUNT(DISTINCT p.id) AS assigned_phos,
            COUNT(fr.id) FILTER (WHERE fr.approval_status = 'pending' AND COALESCE(fr.is_draft, false) = false) AS pending_queue
        FROM public.user_profiles p
        LEFT JOIN filtered_reports fr ON fr.inspector_id = p.id
        WHERE p.role = 'inspector'
        GROUP BY p.assigned_nccg_id
    ) ap ON ap.nccg_id = n.id
    WHERE n.role = 'nccg_officer'
      AND (COALESCE(p_zone, '') = '' OR n.zone = p_zone)
),
exceptions AS (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', fr.id,
                'business_name', fr.business_name,
                'permit_no', fr.permit_no,
                'inspection_date', fr.inspection_date,
                'payment_date', fr.payment_date,
                'reason', ex.reason,
                'owner', ex.owner,
                'urgent', ex.urgent
            )
            ORDER BY ex.urgent DESC, fr.inspection_date DESC
        ),
        '[]'::jsonb
    ) AS data
    FROM (
        SELECT
            fr.*,
            CASE
                WHEN fr.payment_status = 'flagged' THEN 'Payment Verification Flagged'
                ELSE 'Stuck Pending'
            END AS reason,
            CASE
                WHEN fr.payment_status = 'flagged' THEN COALESCE(fr.payment_verified_by::text, 'Finance')
                ELSE COALESCE(fr.inspector_name, 'PHO')
            END AS owner,
            CASE
                WHEN fr.payment_status = 'flagged' THEN true
                ELSE false
            END AS urgent
        FROM filtered_reports fr
        WHERE fr.payment_status = 'flagged'
           OR (
               fr.approval_status = 'pending'
               AND fr.inspection_date IS NOT NULL
               AND fr.inspection_date::date <= CURRENT_DATE - INTERVAL '3 days'
           )
        ORDER BY fr.inspection_date DESC
        LIMIT 25
    ) ex
    JOIN filtered_reports fr ON fr.id = ex.id
)
SELECT jsonb_build_object(
    'today_count', COALESCE((SELECT today_count FROM report_counts), 0),
    'pending_count', COALESCE((SELECT pending_count FROM report_counts), 0),
    'declined_count', COALESCE((SELECT declined_count FROM report_counts), 0),
    'overdue_count', COALESCE((SELECT overdue_count FROM report_counts), 0),
    'pho_metrics', COALESCE((SELECT data FROM pho_metrics), '[]'::jsonb),
    'nccg_metrics', COALESCE((SELECT data FROM nccg_metrics), '[]'::jsonb),
    'exceptions', COALESCE((SELECT data FROM exceptions), '[]'::jsonb)
);
$$;

CREATE OR REPLACE FUNCTION public.get_finance_summary(
    p_search TEXT DEFAULT NULL,
    p_start DATE DEFAULT NULL,
    p_end DATE DEFAULT NULL,
    p_status TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
    SELECT i.*, b.business_name
    FROM public.inspections i
    LEFT JOIN public.businesses b ON b.id = i.business_id
    WHERE (
        COALESCE(p_search, '') = ''
        OR lower(COALESCE(b.business_name, '')) LIKE '%' || lower(p_search) || '%'
        OR lower(COALESCE(i.payment_ref, '')) LIKE '%' || lower(p_search) || '%'
    )
    AND (
        p_start IS NULL
        OR COALESCE(i.payment_date::date, i.inspection_date::date) >= p_start
    )
    AND (
        p_end IS NULL
        OR COALESCE(i.payment_date::date, i.inspection_date::date) <= p_end
    )
    AND (
        COALESCE(p_status, 'all') = 'all'
        OR (p_status = 'unpaid' AND COALESCE(i.payment_status, 'unpaid') IN ('unpaid', 'pending'))
        OR (p_status = 'collected_on_ground' AND i.payment_status = 'collected_on_ground')
        OR (p_status = 'verified_by_finance' AND i.payment_status = 'verified_by_finance')
        OR (p_status = 'flagged' AND i.payment_status = 'flagged')
        OR (p_status = 'overdue' AND COALESCE(i.payment_status, 'unpaid') IN ('pending', 'unpaid'))
    )
),
totals AS (
    SELECT
        COALESCE(SUM(amount_paid) FILTER (WHERE is_paid = true), 0) AS total_revenue,
        COALESCE(SUM(amount_paid) FILTER (WHERE is_paid = true AND payment_date::date = CURRENT_DATE), 0) AS today_revenue,
        COALESCE(SUM(amount_paid) FILTER (WHERE is_paid = true AND to_char(payment_date, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')), 0) AS month_revenue,
        COALESCE(SUM(COALESCE(amount_paid, calculated_fee, 0)) FILTER (WHERE COALESCE(is_paid, false) = false AND status = 'completed'), 0) AS pending_value,
        COALESCE(AVG(GREATEST(0, payment_date::date - inspection_date::date)) FILTER (WHERE is_paid = true AND payment_date IS NOT NULL AND inspection_date IS NOT NULL), 0) AS avg_days_to_pay
    FROM filtered
)
SELECT jsonb_build_object(
    'today_revenue', COALESCE((SELECT today_revenue FROM totals), 0),
    'month_revenue', COALESCE((SELECT month_revenue FROM totals), 0),
    'total_revenue', COALESCE((SELECT total_revenue FROM totals), 0),
    'pending_value', COALESCE((SELECT pending_value FROM totals), 0),
    'avg_days_to_pay', ROUND(COALESCE((SELECT avg_days_to_pay FROM totals), 0)::numeric, 1)
);
$$;

CREATE OR REPLACE FUNCTION public.get_pho_history_summary(
    p_inspector_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
SELECT jsonb_build_object(
    'drafts', COUNT(*) FILTER (WHERE COALESCE(is_draft, false) = true),
    'pending', COUNT(*) FILTER (WHERE COALESCE(is_draft, false) = false AND approval_status = 'pending'),
    'declined', COUNT(*) FILTER (WHERE approval_status = 'declined'),
    'approved', COUNT(*) FILTER (WHERE approval_status = 'approved')
)
FROM public.inspections
WHERE inspector_id = p_inspector_id;
$$;
