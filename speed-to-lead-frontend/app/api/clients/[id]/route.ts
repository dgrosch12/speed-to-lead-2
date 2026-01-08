import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'

// Use service role key for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

/**
 * DELETE /api/clients/[id]
 * 
 * Deletes a client and all associated workflows.
 * 
 * Following SaaS best practices:
 * 1. Hard delete: Actually removes from database (since you have ON DELETE CASCADE)
 * 2. Also deletes/pauses workflows in n8n
 * 3. Returns detailed information about what was deleted
 * 
 * Alternative approach (soft delete) would be:
 * - Add `deleted_at TIMESTAMP` column to clients table
 * - Filter out deleted clients: WHERE deleted_at IS NULL
 * - Benefits: Can recover, audit trail, historical data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured' 
      }, { status: 500 })
    }

    const { id } = params

    // Step 1: Get the client and all associated workflows
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        *,
        workflows (
          id,
          n8n_workflow_id,
          workflow_name,
          status
        )
      `)
      .eq('id', id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ 
        error: 'Client not found',
        details: clientError?.message 
      }, { status: 404 })
    }

    const workflows = client.workflows || []

    // Step 2: Keep workflows in n8n (don't delete them)
    // We only delete from Supabase - workflows remain in n8n for potential future use

    // Step 3: Delete the client from Supabase
    // This will CASCADE delete all associated workflows due to ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete client',
        details: deleteError.message 
      }, { status: 500 })
    }

    // Step 4: Return summary of what was deleted
    return NextResponse.json({
      success: true,
      message: 'Client and associated workflows deleted successfully',
      deleted: {
        client: {
          id: client.id,
          business_name: client.business_name || client.name,
        },
        workflows: {
          count: workflows.length,
          // Workflows in Supabase were automatically deleted via CASCADE
          // n8n workflows were kept (not deleted) for potential future use
          n8n_workflows_kept: workflows.map((w: any) => ({
            id: w.n8n_workflow_id,
            name: w.workflow_name,
            note: 'Workflow still exists in n8n and can be re-linked later'
          }))
        }
      }
    })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

