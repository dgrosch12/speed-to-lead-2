-- Add missing columns to the existing clients table
-- These columns are required by the workflow creation code

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS twilio_number TEXT;

-- Update existing rows to populate business_name from name if needed
-- (only if business_name is null and name exists)
UPDATE public.clients
SET business_name = name
WHERE business_name IS NULL AND name IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.clients.business_name IS 'Business name (also used as id)';
COMMENT ON COLUMN public.clients.owner_name IS 'Owner/contact name';
COMMENT ON COLUMN public.clients.business_phone IS 'Business phone number in +1XXXXXXXXXX format';
COMMENT ON COLUMN public.clients.twilio_number IS 'Twilio phone number in +1XXXXXXXXXX format';

