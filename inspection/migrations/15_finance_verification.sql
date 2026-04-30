ALTER TABLE inspections ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS payment_collected_by UUID REFERENCES public.user_profiles(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES public.user_profiles(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS finance_verification_notes TEXT;

-- Seed script or existing data update
UPDATE inspections SET payment_status = 'verified_by_finance' WHERE is_paid = true;
