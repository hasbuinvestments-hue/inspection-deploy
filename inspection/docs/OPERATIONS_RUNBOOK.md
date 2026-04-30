# Operations Runbook

## Environments
- `development`: local React + Supabase project
- `staging`: pre-production validation
- `production`: live users

## Pre-Deploy Checklist
1. Run `npm test`
2. Run `npm run build`
3. Run `npm run ops:smoke`
4. Confirm latest migrations exist and are ordered:
   - `19_resolve_staff_login_email.sql`
   - `20_report_verification.sql`
   - `21_performance_hardening.sql`
5. Apply migrations to staging, validate core flows.
6. Apply same migrations to production in the same order.

## Post-Deploy Checks
1. Login with email and staff ID.
2. Submit PHO draft, resume, and finalize.
3. NCCG approve and decline one report each.
4. Finance verify and flag one payment each.
5. Download PDF and verify code at `/verify/<code>`.
6. Confirm new entries appear in `report_verification_logs`.

## Monitoring and Alerting
- Track client errors from `client_error_logs`.
- Track verification abuse patterns from `report_verification_logs`.
- Suggested alerts:
  - error spikes (>30 errors / 5 minutes)
  - high invalid verification rate (>40 invalid checks / hour)
  - sustained login failures for a single identifier.

## Backup and Restore Drills
1. Weekly: create full backup snapshot from Supabase.
2. Monthly: restore snapshot into a temporary project.
3. Validate restored project:
   - row counts for `inspections`, `businesses`, `user_profiles`
   - RPC availability (`get_admin_dashboard_metrics`, `verify_report_public`)
   - login and report verification smoke tests.

## Incident Handling
1. Detect: alert or user report.
2. Triage: classify as auth, data, payments, or verification issue.
3. Contain: disable affected workflow if needed.
4. Recover: patch + migration + redeploy.
5. Review: write postmortem with root cause and prevention actions.

## Rollback Notes
- UI-only issue: roll back frontend artifact.
- DB issue: deploy corrective migration; avoid destructive rollback unless tested.
- Always preserve audit tables (`client_error_logs`, `report_verification_logs`).
