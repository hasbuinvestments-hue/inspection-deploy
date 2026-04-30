-- Enforce user creation hierarchy:
-- - super_admin can create only admin accounts
-- - admin can create only operational staff accounts
-- - only inspector and nccg_officer are zone-locked

-- Ensure pgcrypto is enabled (usually in extensions schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
-- Added 'extensions' to search_path to resolve pgcrypto functions (crypt, gen_salt)
SET search_path = public, auth, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  caller_role TEXT;
  normalized_zone TEXT;
BEGIN
  -- Use our optimized cached helper instead of a direct query to avoid RLS overhead
  caller_role := public.get_my_role();

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Missing or inactive profile for caller.';
  END IF;

  normalized_zone := NULLIF(trim(COALESCE(p_zone, '')), '');

  IF caller_role = 'super_admin' THEN
    IF p_role <> 'admin' THEN
      RAISE EXCEPTION 'Super admin can only create admin accounts.';
    END IF;
  ELSIF caller_role = 'admin' THEN
    IF p_role NOT IN ('inspector', 'nccg_officer', 'finance_manager') THEN
      RAISE EXCEPTION 'Admin can only create PHO, NCCG, or Finance staff.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Insufficient privileges to create staff.';
  END IF;

  -- Only inspector and nccg_officer are zone-locked.
  IF p_role IN ('inspector', 'nccg_officer') AND normalized_zone IS NULL THEN
    RAISE EXCEPTION 'Zone is required for role %.', p_role;
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Create Auth User with basic GoTrue compatibility
  -- Added instance_id as it is often critical for Supabase Auth to recognize the user
  INSERT INTO auth.users (
    id, 
    instance_id,
    email, 
    encrypted_password, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    aud, 
    role,
    is_super_admin,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf', 10)),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    'authenticated',
    'authenticated',
    false,
    now(),
    now()
  );

  -- Manually set confirmation to avoid generated column insert issues if they exist
  UPDATE auth.users 
  SET email_confirmed_at = now() 
  WHERE auth.users.id = new_user_id;

  -- Create Profile
  INSERT INTO public.user_profiles (id, full_name, role, staff_id, zone, created_by, is_active)
  VALUES (
    new_user_id,
    p_full_name,
    p_role,
    p_staff_id,
    normalized_zone,
    auth.uid(),
    true
  );

  RETURN new_user_id;
END;
$$;


