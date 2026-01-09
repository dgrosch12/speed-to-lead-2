import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractLeadFormWebhook, extractIVRWebhook } from '@/lib/n8n-helpers'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

// Check if string is a UUID (Supabase workflow ID)
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First, try to fetch from Supabase (if it's a UUID)
    if (isUUID(id)) {
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select(`
          *,
          clients (
            id,
            name,
            business_name,
            owner_name,
            business_phone,
            twilio_number,
            website
          )
        `)
        .eq('id', id)
        .single()

      if (!error && workflow) {
        return NextResponse.json({ workflow })
      }
    }

    // If not found in Supabase or ID is not a UUID, try to fetch from n8n
    console.log('Fetching workflow from n8n:', id)
    const n8nResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${id}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!n8nResponse.ok) {
      console.error('Error fetching workflow from n8n:', n8nResponse.statusText)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const n8nWorkflow = await n8nResponse.json()
    
    // Extract webhook URLs
    const leadFormWebhook = extractLeadFormWebhook(n8nWorkflow, N8N_API_URL)
    const ivrWebhook = extractIVRWebhook(n8nWorkflow, N8N_API_URL)
    const n8nUrl = `${N8N_API_URL}/workflow/${id}`

    // Try to find the client by matching workflow name
    // Workflow names are typically "Client Name - STL"
    const workflowName = n8nWorkflow.name || ''
    const clientNameMatch = workflowName.match(/^(.+?)\s*-\s*STL$/i)
    const clientName = clientNameMatch ? clientNameMatch[1].trim() : workflowName.replace(' - STL', '').trim()

    // Find client in Supabase
    let client = null
    if (clientName) {
      // Try to find client by id, name, or business_name
      let { data: clientData } = await supabase
        .from('clients')
        .select('id, name, business_name, owner_name, business_phone, twilio_number, website')
        .eq('id', clientName)
        .single()

      if (!clientData) {
        const { data: clientByName } = await supabase
          .from('clients')
          .select('id, name, business_name, owner_name, business_phone, twilio_number, website')
          .eq('name', clientName)
          .single()
        clientData = clientByName || null
      }

      if (!clientData) {
        const { data: clientByBusinessName } = await supabase
          .from('clients')
          .select('id, name, business_name, owner_name, business_phone, twilio_number, website')
          .eq('business_name', clientName)
          .single()
        clientData = clientByBusinessName || null
      }

      client = clientData
    }

    // If no client found, create a basic client object from workflow name
    if (!client) {
      client = {
        id: clientName || id,
        name: clientName || 'Unknown Client',
        business_name: clientName || undefined,
        owner_name: null,
        business_phone: null,
        twilio_number: null,
        website: null,
      }
    }

    // Build workflow object in Supabase format
    const workflow = {
      id: id, // Use n8n ID as identifier
      client_id: client.id,
      n8n_workflow_id: id,
      workflow_name: n8nWorkflow.name || 'Unknown Workflow',
      status: n8nWorkflow.active ? 'active' : 'paused',
      lead_form_webhook: leadFormWebhook || null,
      ivr_webhook: ivrWebhook || null,
      n8n_url: n8nUrl,
      created_at: n8nWorkflow.createdAt || new Date().toISOString(),
      last_activity: n8nWorkflow.updatedAt || null,
      clients: client,
    }

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status } = body

    // Validate status if provided
    if (status && !['active', 'paused', 'error'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update workflow
    const updateData: any = {}
    if (status) {
      updateData.status = status
    }

    const { data: updatedWorkflow, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        clients (
          id,
          name,
          business_name,
          owner_name,
          business_phone,
          twilio_number,
          website
        )
      `)
      .single()

    if (error) {
      console.error('Error updating workflow:', error)
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
    }

    return NextResponse.json({ workflow: updatedWorkflow })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Note: This endpoint exists but we don't actually delete from Supabase
    // The frontend handles deletion by filtering out workflows client-side
    // This is intentional - we only remove from the frontend view, not the database
    
    return NextResponse.json({ 
      success: true, 
      message: 'Workflow removed from view (not deleted from database)' 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}