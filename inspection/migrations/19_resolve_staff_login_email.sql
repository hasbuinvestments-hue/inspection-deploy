CREATE OR REPLACE FUNCTION public.resolve_staff_login_email(p_staff_id TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_email TEXT;
BEGIN
  SELECT u.email
  INTO resolved_email
  FROM public.user_profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.staff_id = p_staff_id
    AND p.is_active = true
  LIMIT 1;

  RETURN resolved_email;
END;
$$;
