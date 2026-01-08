-- Create clients table (if it doesn't exist or needs updating)
-- Note: id is TEXT because it's set to business_name
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  twilio_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Add comment to table
COMMENT ON TABLE clients IS 'Stores client information with id set to business_name';

