import { NextResponse } from 'next/server'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

export async function GET() {
  try {
    // Fetch all workflows from n8n
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch workflows from n8n' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const workflows = data.data || []

    // Map workflows to include n8n URL and lead form webhook URL (if present)
    const workflowsWithUrls = workflows.map((workflow: any) => {
      let leadFormWebhook: string | undefined = undefined
      try {
        const nodes = workflow.nodes || []
        // Prefer the node explicitly named "Lead Form" (case-insensitive)
        let webhookNode =
          nodes.find(
            (n: any) =>
              n?.type === 'n8n-nodes-base.webhook' &&
              String(n?.name || '').toLowerCase() === 'lead form'
          ) ||
          // Fallback: any webhook whose name contains 'lead form'
          nodes.find(
            (n: any) =>
              n?.type === 'n8n-nodes-base.webhook' &&
              String(n?.name || '').toLowerCase().includes('lead form')
          )

        // Use webhookId for production URL (most reliable on n8n Cloud)
        const webhookId = webhookNode?.webhookId as string | undefined
        if (webhookId) {
          leadFormWebhook = `${N8N_API_URL}/webhook/${webhookId}`
        }
      } catch {}

      return {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        n8n_url: `${N8N_API_URL}/workflow/${workflow.id}`,
        lead_form_webhook: leadFormWebhook,
        created_at: workflow.createdAt,
        updated_at: workflow.updatedAt,
      }
    })

    return NextResponse.json({ workflows: workflowsWithUrls })
  } catch (error) {
    console.error('Error fetching n8n workflows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows from n8n' },
      { status: 500 }
    )
  }
}

