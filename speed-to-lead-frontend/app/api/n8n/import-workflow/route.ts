import { NextRequest, NextResponse } from 'next/server'
import { extractLeadFormWebhook, extractIVRWebhook } from '@/lib/n8n-helpers'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

/**
 * Import a workflow template into n8n and return the workflow with extracted webhook URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowTemplate, workflowName } = body

    if (!workflowTemplate) {
      return NextResponse.json(
        { error: 'Workflow template is required' },
        { status: 400 }
      )
    }

    // Customize the workflow name if provided
    const template = { ...workflowTemplate }
    if (workflowName) {
      template.name = workflowName
    }

    // Import workflow to n8n
    const importResponse = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    })

    if (!importResponse.ok) {
      const errorText = await importResponse.text()
      console.error('Failed to import workflow to n8n:', errorText)
      return NextResponse.json(
        { error: `Failed to import workflow: ${errorText}` },
        { status: importResponse.status }
      )
    }

    const importedWorkflow = await importResponse.json()
    const n8nWorkflowId = importedWorkflow.id

    // Fetch the workflow back to get actual webhookIds (n8n may regenerate them)
    const fetchResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch imported workflow' },
        { status: fetchResponse.status }
      )
    }

    const workflowData = await fetchResponse.json()

    // Extract webhook URLs
    const leadFormWebhook = extractLeadFormWebhook(workflowData, N8N_API_URL)
    const ivrWebhook = extractIVRWebhook(workflowData, N8N_API_URL)
    const n8nUrl = `${N8N_API_URL}/workflow/${n8nWorkflowId}`

    return NextResponse.json({
      success: true,
      workflow: {
        id: n8nWorkflowId,
        name: workflowData.name,
        active: workflowData.active,
        n8n_url: n8nUrl,
        lead_form_webhook: leadFormWebhook,
        ivr_webhook: ivrWebhook,
      },
    })
  } catch (error) {
    console.error('Error importing workflow:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

