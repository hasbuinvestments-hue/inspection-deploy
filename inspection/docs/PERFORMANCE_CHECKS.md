# Performance Checks

## Target Query Families
- NCCG queue loading (`inspections` by `inspector_id`, `approval_status`, `is_draft`)
- Finance queue loading (`inspections` by `payment_status`, `is_paid`)
- Public report verification (`inspections` by `verification_code`)
- Business search (`businesses` by `business_name`, `permit_no`, `subcounty_name`)

## Required Index Migrations
- `16_scaling_support.sql`
- `21_performance_hardening.sql`

## EXPLAIN Validation Queries
Run these in Supabase SQL editor after migrations are applied.

```sql
EXPLAIN ANALYZE
SELECT id, inspection_date
FROM public.inspections
WHERE inspector_id = '00000000-0000-0000-0000-000000000000'
  AND approval_status = 'pending'
  AND COALESCE(is_draft, false) = false
ORDER BY created_at DESC
LIMIT 20;
```

```sql
EXPLAIN ANALYZE
SELECT id, payment_status, amount_paid
FROM public.inspections
WHERE payment_status IN ('collected_on_ground', 'verified_by_finance')
  AND COALESCE(is_paid, false) = true
ORDER BY inspection_date DESC
LIMIT 20;
```

```sql
EXPLAIN ANALYZE
SELECT id, verification_code, approval_status
FROM public.inspections
WHERE verification_code = 'ABCDEF123456'
  AND approval_status = 'approved'
  AND COALESCE(is_draft, false) = false
  AND COALESCE(is_current_version, true) = true;
```

```sql
EXPLAIN ANALYZE
SELECT id, business_name, permit_no
FROM public.businesses
WHERE lower(business_name) LIKE '%hotel%'
   OR lower(permit_no) LIKE '%1234%'
   OR lower(subcounty_name) LIKE '%westlands%'
LIMIT 20;
```

## What “Good” Looks Like
- Planner uses `Index Scan`, `Bitmap Index Scan`, or `Index Only Scan`.
- Avoid `Seq Scan` on large tables for the target filters above.
- P95 response target:
  - queues: < 300ms
  - verification lookup: < 100ms
  - search: < 300ms
