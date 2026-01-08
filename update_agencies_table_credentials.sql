-- Add credential fields to agencies table
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS n8n_instance_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_api_key TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS twilio_api_key TEXT;

-- Add comments
COMMENT ON COLUMN agencies.n8n_instance_url IS 'n8n instance URL for this agency';
COMMENT ON COLUMN agencies.n8n_api_key IS 'n8n API key for this agency';
COMMENT ON COLUMN agencies.openai_api_key IS 'OpenAI API key for this agency';
COMMENT ON COLUMN agencies.twilio_api_key IS 'Twilio API key for this agency';
