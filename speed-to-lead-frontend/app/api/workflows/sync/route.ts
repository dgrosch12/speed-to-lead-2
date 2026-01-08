import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractLeadFormWebhook, extractIVRWebhook } from '@/lib/n8n-helpers'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

// Sync all n8n workflows to Supabase
export async function GET(request: NextRequest) {
  // Allow GET for easy browser access, but also support POST
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    // Fetch all workflows from n8n
    const n8nResponse = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!n8nResponse.ok) {
      throw new Error('Failed to fetch workflows from n8n')
    }

    const n8nData = await n8nResponse.json()
    console.log('n8n API response structure:', {
      isArray: Array.isArray(n8nData),
      hasData: !!n8nData.data,
      hasWorkflows: !!n8nData.workflows,
      keys: Object.keys(n8nData || {})
    })
    
    // n8n API returns workflows in different formats - check multiple possibilities
    let n8nWorkflows: any[] = []
    if (Array.isArray(n8nData)) {
      n8nWorkflows = n8nData
    } else if (n8nData.data && Array.isArray(n8nData.data)) {
      n8nWorkflows = n8nData.data
    } else if (n8nData.workflows && Array.isArray(n8nData.workflows)) {
      n8nWorkflows = n8nData.workflows
    } else {
      console.error('Unexpected n8n workflows format:', JSON.stringify(n8nData, null, 2))
      throw new Error(`Invalid workflows format from n8n API. Expected array or object with 'data' or 'workflows' property. Got: ${typeof n8nData}`)
    }
    
    console.log(`Found ${n8nWorkflows.length} workflows in n8n`)

    // Fetch all clients from Supabase
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, business_name')

    if (!clients) {
      throw new Error('Failed to fetch clients')
    }

    // Fetch existing workflows from Supabase to avoid duplicates
    const { data: existingWorkflows } = await supabase
      .from('workflows')
      .select('n8n_workflow_id')

    const existingN8nIds = new Set((existingWorkflows || []).map((w: any) => w.n8n_workflow_id))
    console.log(`Found ${existingN8nIds.size} existing workflows in Supabase`)

    const synced: any[] = []
    const skipped: any[] = []

    // Process each n8n workflow
    for (const n8nWorkflow of n8nWorkflows) {
      // Skip if already in Supabase
      if (existingN8nIds.has(n8nWorkflow.id)) {
        skipped.push({ n8n_id: n8nWorkflow.id, reason: 'Already exists' })
        continue
      }

      // Extract client name from workflow name (format: "Client Name - STL")
      const workflowName = n8nWorkflow.name || ''
      const clientNameMatch = workflowName.match(/^(.+?)\s*-\s*STL$/i)
      const clientName = clientNameMatch ? clientNameMatch[1].trim() : workflowName.replace(' - STL', '').trim()

      // Find matching client
      const client = clients.find((c: any) => 
        c.id === clientName || 
        c.name === clientName || 
        c.business_name === clientName
      )

      if (!client) {
        skipped.push({ 
          n8n_id: n8nWorkflow.id, 
          workflow_name: workflowName,
          reason: `No matching client found for "${clientName}"` 
        })
        continue
      }

      // Fetch full workflow data to extract webhooks
      const workflowDetailResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflow.id}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      })

      if (!workflowDetailResponse.ok) {
        skipped.push({ 
          n8n_id: n8nWorkflow.id, 
          reason: 'Failed to fetch workflow details' 
        })
        continue
      }

      const workflowData = await workflowDetailResponse.json()

      // Extract webhooks
      const leadFormWebhook = extractLeadFormWebhook(workflowData, N8N_API_URL)
      const ivrWebhook = extractIVRWebhook(workflowData, N8N_API_URL)
      const n8nUrl = `${N8N_API_URL}/workflow/${n8nWorkflow.id}`

      // Insert into Supabase
      const { data: newWorkflow, error: insertError } = await supabase
        .from('workflows')
        .insert({
          client_id: client.id,
          n8n_workflow_id: n8nWorkflow.id,
          workflow_name: workflowName,
          status: n8nWorkflow.active ? 'active' : 'paused',
          lead_form_webhook: leadFormWebhook || null,
          ivr_webhook: ivrWebhook || null,
          n8n_url: n8nUrl,
        })
        .select()
        .single()

      if (insertError) {
        console.error(`Failed to sync workflow ${n8nWorkflow.id}:`, insertError)
        skipped.push({ 
          n8n_id: n8nWorkflow.id, 
          reason: insertError.message 
        })
      } else {
        synced.push({
          workflow_id: newWorkflow.id,
          n8n_workflow_id: n8nWorkflow.id,
          workflow_name: workflowName,
          client_id: client.id,
        })
        console.log(`Synced workflow: ${workflowName} for client ${client.id}`)
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      skipped: skipped.length,
      synced_workflows: synced,
      skipped_workflows: skipped,
      message: `Synced ${synced.length} workflows, skipped ${skipped.length}`
    })

  } catch (error) {
    console.error('Error syncing workflows:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

