BEGIN;

-- 1. NUCLEAR DROP: Delete EVERY policy on user_profiles using dynamic SQL
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (
        SELECT polname 
        FROM pg_policy 
        WHERE polrelid = 'public.user_profiles'::regclass
    ) LOOP
        EXECUTE format('DROP POLICY %I ON public.user_profiles', r.polname);
    END LOOP;
END $$;

-- 2. Drop the helper function
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;

-- 3. Redefine helper with TRANSACTION CACHE
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
DECLARE
    _role text;
BEGIN
    -- Cache check
    _role := current_setting('app.current_role', true);
    IF _role IS NOT NULL AND _role <> '' THEN
        RETURN _role;
    END IF;

    -- Fetch
    SELECT role INTO _role FROM public.user_profiles WHERE id = auth.uid();
    
    -- Cache
    IF _role IS NOT NULL THEN
        PERFORM set_config('app.current_role', _role, true);
    END IF;

    RETURN _role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. Apply MINIMAL policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy A: Self access (NO FUNCTION CALL)
CREATE POLICY "user_profiles_self_all"
ON public.user_profiles
FOR ALL
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy B: SuperAdmin access (Only for OTHER rows)
CREATE POLICY "user_profiles_superadmin_all"
ON public.user_profiles
FOR ALL
USING (
    (id != auth.uid() AND public.get_my_role() = 'super_admin')
)
WITH CHECK (
    (id != auth.uid() AND public.get_my_role() = 'super_admin')
);

-- Policy C: Admin access (Only for OTHER rows)
CREATE POLICY "user_profiles_admin_select"
ON public.user_profiles
FOR SELECT
USING (
    id != auth.uid() 
    AND public.get_my_role() = 'admin'
    AND role IN ('inspector', 'nccg_officer', 'finance_manager')
);

COMMIT;



