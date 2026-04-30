BEGIN;

-- Add missing columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_nccg_id TEXT;

-- Expand role check constraint
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'inspector', 'nccg_officer', 'finance_manager'));

COMMIT;

