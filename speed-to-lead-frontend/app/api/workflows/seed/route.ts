import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// One-time endpoint to seed High Caliber HVAC workflow
export async function POST() {
  try {
    // High Caliber HVAC client data
    const clientData = {
      business_name: 'High Caliber HVAC',
      owner_name: 'Chris Johnson',
      business_phone: '+12547021243',
      twilio_number: '+12544101386',
      client_id: 'high-caliber'
    }

    // Check if client already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('client_id', 'high-caliber')
      .single()

    let clientId: string

    if (existingClient) {
      // Update existing client
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({
          ...clientData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClient.id)
        .select()
        .single()

      if (updateError) throw updateError
      clientId = updatedClient.id
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()

      if (clientError) throw clientError
      clientId = newClient.id
    }

    // Workflow data from the High Caliber JSON file
    const workflowData = {
      client_id: clientId,
      n8n_workflow_id: 'vc044ImIQ6wrSFyD', // Actual n8n workflow ID from API
      workflow_name: 'High Caliber HVAC - STL',
      status: 'active' as const,
      lead_form_webhook: 'https://contractorkingdom.app.n8n.cloud/webhook/fd0f39ec-58c7-4aee-8f52-92d52d49c9d6',
      ivr_webhook: 'https://contractorkingdom.app.n8n.cloud/webhook/c925ec3e-2841-45c0-bd0b-38b6638a4bfb',
      n8n_url: 'https://contractorkingdom.app.n8n.cloud/workflow/vc044ImIQ6wrSFyD' // Actual workflow URL
    }

    // Check if workflow already exists
    const { data: existingWorkflow } = await supabase
      .from('workflows')
      .select('id')
      .eq('client_id', clientId)
      .single()

    let workflow

    if (existingWorkflow) {
      // Update existing workflow
      const { data: updatedWorkflow, error: workflowError } = await supabase
        .from('workflows')
        .update(workflowData)
        .eq('id', existingWorkflow.id)
        .select(`
          *,
          clients (
            business_name,
            owner_name,
            client_id,
            business_phone,
            twilio_number
          )
        `)
        .single()

      if (workflowError) throw workflowError
      workflow = updatedWorkflow
    } else {
      // Create new workflow
      const { data: newWorkflow, error: workflowError } = await supabase
        .from('workflows')
        .insert(workflowData)
        .select(`
          *,
          clients (
            business_name,
            owner_name,
            client_id,
            business_phone,
            twilio_number
          )
        `)
        .single()

      if (workflowError) throw workflowError
      workflow = newWorkflow
    }

    return NextResponse.json({
      success: true,
      workflow,
      message: 'High Caliber workflow seeded successfully!'
    })

  } catch (error) {
    console.error('Error seeding workflow:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error && 'code' in error ? String(error.code) : 'unknown'
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails,
      hint: 'Make sure the clients and workflows tables exist in Supabase. Check the README for SQL setup instructions.'
    }, { status: 500 })
  }
}

