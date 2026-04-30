-- Security Hardening: Move Admin actions to secure RPCs
-- This allows removing the Service Role key from the client-side code.

-- 1. Secure User Purge (Superadmin Only)
CREATE OR REPLACE FUNCTION public.admin_purge_user(target_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if caller is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only Superadmins can purge users.';
  END IF;

  -- Delete from profiles (CASCADE might handle auth, but often not)
  DELETE FROM public.user_profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (Requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 2. Secure User Creation (Admin/Superadmin Only)
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_staff_id TEXT,
    p_zone TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if caller is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient privileges to create staff.';
  END IF;

  -- Create Auth User
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    p_email, 
    crypt(p_password, gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', p_full_name),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO new_user_id;

  -- Create Profile
  INSERT INTO public.user_profiles (id, full_name, role, staff_id, zone, is_active)
  VALUES (new_user_id, p_full_name, p_role, p_staff_id, p_zone, true);

  RETURN new_user_id;
END;
$$;
