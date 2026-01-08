import { NextRequest, NextResponse } from 'next/server'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch workflow from n8n API
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${id}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Workflow not found in n8n' },
        { status: 404 }
      )
    }

    const workflow = await response.json()

    // Construct the n8n workflow URL
    const n8nUrl = `${N8N_API_URL}/workflow/${workflow.id}`

    return NextResponse.json({
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      active: workflow.active,
      n8n_url: n8nUrl,
      created_at: workflow.createdAt,
      updated_at: workflow.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching n8n workflow:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow from n8n' },
      { status: 500 }
    )
  }
}

