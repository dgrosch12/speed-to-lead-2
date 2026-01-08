import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractLeadFormWebhook, extractIVRWebhook } from '@/lib/n8n-helpers'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

/**
 * Fix/Update a workflow record in Supabase by fetching fresh data from n8n
 * This endpoint fetches the workflow from n8n, extracts webhooks, checks status,
 * and updates the Supabase record with the correct values
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params // This is the Supabase workflow UUID

    // First, get the workflow from Supabase to get the n8n_workflow_id
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('id, n8n_workflow_id, workflow_name, client_id')
      .eq('id', id)
      .single()

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found in Supabase', details: fetchError?.message },
        { status: 404 }
      )
    }

    const n8nWorkflowId = workflow.n8n_workflow_id
    if (!n8nWorkflowId) {
      return NextResponse.json(
        { error: 'Workflow missing n8n_workflow_id' },
        { status: 400 }
      )
    }

    // Fetch the workflow from n8n to get current status and webhooks
    console.log(`Fetching workflow from n8n: ${n8nWorkflowId}`)
    const n8nResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      return NextResponse.json(
        { error: 'Failed to fetch workflow from n8n', details: errorText },
        { status: n8nResponse.status }
      )
    }

    const n8nWorkflow = await n8nResponse.json()

    // Extract webhook URLs
    const leadFormWebhook = extractLeadFormWebhook(n8nWorkflow, N8N_API_URL)
    const ivrWebhook = extractIVRWebhook(n8nWorkflow, N8N_API_URL)
    
    // Get workflow status from n8n
    const n8nStatus = n8nWorkflow.active ? 'active' : 'paused'
    
    console.log('Extracted data:', {
      leadFormWebhook,
      ivrWebhook,
      status: n8nStatus,
      n8nActive: n8nWorkflow.active
    })

    // Update the workflow in Supabase
    const updateData: any = {
      status: n8nStatus,
      updated_at: new Date().toISOString(),
    }

    if (leadFormWebhook) {
      updateData.lead_form_webhook = leadFormWebhook
    }

    if (ivrWebhook) {
      updateData.ivr_webhook = ivrWebhook
    }

    // If workflow is active in n8n but paused in Supabase, update it
    // Or if webhook was missing, update it
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating workflow:', updateError)
      return NextResponse.json(
        { error: 'Failed to update workflow in Supabase', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow updated successfully',
      workflow: updatedWorkflow,
      changes: {
        status: workflow.status !== n8nStatus ? `${workflow.status} → ${n8nStatus}` : 'unchanged',
        lead_form_webhook: !workflow.lead_form_webhook && leadFormWebhook ? 'added' : workflow.lead_form_webhook !== leadFormWebhook ? 'updated' : 'unchanged',
        ivr_webhook: ivrWebhook ? 'updated' : 'unchanged',
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

