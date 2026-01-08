-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  n8n_workflow_id TEXT NOT NULL UNIQUE,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  lead_form_webhook TEXT,
  ivr_webhook TEXT,
  n8n_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflows_client_id ON workflows(client_id);

-- Create index on n8n_workflow_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflows_n8n_workflow_id ON workflows(n8n_workflow_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);

-- Add comment to table
COMMENT ON TABLE workflows IS 'Stores n8n workflow configurations and webhook URLs for each client';

