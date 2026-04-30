ALTER TABLE inspections ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES public.user_profiles(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS decline_reason TEXT;
