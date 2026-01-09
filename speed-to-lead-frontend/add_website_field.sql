-- Add website field to clients table
ALTER TABLE clients 
ADD COLUMN website TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN clients.website IS 'Client business website URL';

-- Optional: Add a check constraint to ensure URLs are properly formatted (if desired)
-- ALTER TABLE clients 
-- ADD CONSTRAINT clients_website_format_check 
-- CHECK (website IS NULL OR website ~ '^https?://.*');