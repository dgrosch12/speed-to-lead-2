import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Types for our database tables
export interface Agency {
  id: string
  name: string
  n8n_instance_url?: string
  n8n_api_key?: string
  openai_api_key?: string
  twilio_api_key?: string
  created_at: string
  updated_at?: string
}

export interface Client {
  id: string
  name: string
  business_name?: string
  owner_name?: string
  business_phone?: string
  twilio_number?: string
  area_code?: string
  phone_number?: string
  website?: string
  workflows?: number
  calls_7d?: number
  success_7d?: number
  status?: string
  agency_id?: string
  created_at: string
  updated_at?: string
  agency?: Agency
}

export interface Workflow {
  id: string
  client_id: string
  n8n_workflow_id: string
  workflow_name: string
  status: 'active' | 'paused' | 'error'
  lead_form_webhook: string
  ivr_webhook?: string
  n8n_url: string
  created_at: string
  last_activity?: string
  clients?: Client
}

export interface WorkflowStats {
  id: string
  workflow_id: string
  leads_count: number
  calls_count: number
  last_lead?: string
  updated_at: string
}