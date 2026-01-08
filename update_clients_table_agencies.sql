-- Add agency_id column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

-- Create index on agency_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON clients(agency_id);

-- Add comment
COMMENT ON COLUMN clients.agency_id IS 'Foreign key reference to agencies table';
