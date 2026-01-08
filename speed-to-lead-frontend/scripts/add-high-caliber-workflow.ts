// Script to add High Caliber HVAC workflow to Supabase
// Run with: npx tsx scripts/add-high-caliber-workflow.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addHighCaliberWorkflow() {
  try {
    // Check if client already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('client_id', 'high-caliber')
      .single()

    let clientId: string

    if (existingClient) {
      console.log('Client already exists, updating...')
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({
          business_name: 'High Caliber HVAC',
          owner_name: 'Chris Johnson',
          business_phone: '+12547021243',
          twilio_number: '+12544101386',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClient.id)
        .select()
        .single()

      if (updateError) throw updateError
      clientId = updatedClient.id
    } else {
      console.log('Creating new client...')
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          business_name: 'High Caliber HVAC',
          owner_name: 'Chris Johnson',
          business_phone: '+12547021243',
          twilio_number: '+12544101386',
          client_id: 'high-caliber'
        })
        .select()
        .single()

      if (clientError) throw clientError
      clientId = newClient.id
    }

    // Check if workflow already exists
    const { data: existingWorkflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('client_id', clientId)
      .single()

    const workflowData = {
      client_id: clientId,
      n8n_workflow_id: 'high-caliber-stl', // Placeholder - you'll need the actual n8n workflow ID
      workflow_name: 'High Caliber HVAC - STL',
      status: 'active' as const,
      lead_form_webhook: 'https://contractorkingdom.app.n8n.cloud/webhook/fd0f39ec-58c7-4aee-8f52-92d52d49c9d6',
      ivr_webhook: 'https://contractorkingdom.app.n8n.cloud/webhook/c925ec3e-2841-45c0-bd0b-38b6638a4bfb',
      n8n_url: 'https://contractorkingdom.app.n8n.cloud/workflow/high-caliber-stl' // Will need actual workflow ID
    }

    if (existingWorkflow) {
      console.log('Workflow already exists, updating...')
      const { data: updatedWorkflow, error: workflowError } = await supabase
        .from('workflows')
        .update(workflowData)
        .eq('id', existingWorkflow.id)
        .select()
        .single()

      if (workflowError) throw workflowError
      console.log('✅ Workflow updated:', updatedWorkflow)
    } else {
      console.log('Creating new workflow...')
      const { data: newWorkflow, error: workflowError } = await supabase
        .from('workflows')
        .insert(workflowData)
        .select()
        .single()

      if (workflowError) throw workflowError
      console.log('✅ Workflow created:', newWorkflow)
    }

    console.log('✅ High Caliber workflow added successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

addHighCaliberWorkflow()

