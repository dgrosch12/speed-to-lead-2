import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { extractLeadFormWebhook, extractIVRWebhook, fetchTemplateWorkflow, customizeWorkflow } from '@/lib/n8n-helpers'

const N8N_API_URL = process.env.N8N_API_URL || 'https://contractorkingdom.app.n8n.cloud'
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMzQzMDNmMC0yOWVhLTRkZmEtYTA0My1jMjY1NDNjNGFlMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NjMzMDk5fQ.feGWnTaYDTfo1neP8aJiPi7CVZTfwfdcg6Vb9oHCo7c'
const TEMPLATE_WORKFLOW_ID = 'jWiL3dfiI8RXqSAz'

// Get all workflows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    let query = supabase
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
          website,
          agency_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by client_id if provided
    if (clientId) {
      // First, get the client's UUID from the clients table
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .single()

      if (client) {
        query = query.eq('client_id', client.id)
      } else {
        // If client not found by id, try to match by name
        const { data: clientByName } = await supabase
          .from('clients')
          .select('id')
          .eq('name', clientId)
          .single()

        if (clientByName) {
          query = query.eq('client_id', clientByName.id)
        }
      }
    }

    const { data: workflows, error } = await query

    if (error) {
      console.error('Error fetching workflows:', error)
      // Return empty array if table doesn't exist
      if (error.code === 'PGRST116') {
        return NextResponse.json({ workflows: [] })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch workflows',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ workflows: workflows || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business_name, owner_name, business_phone, twilio_number, website, agency_id, link_existing_workflow, existing_n8n_workflow_id, force_create } = body

    // Validate required fields
    if (!business_name || !owner_name || !business_phone || !twilio_number) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Step 0: Check if a workflow with this business name already exists in n8n
    // Only check if we're not already linking an existing workflow and not forcing creation
    if (!link_existing_workflow && !force_create) {
      try {
        const n8nWorkflowsResponse = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
          },
        })

        if (n8nWorkflowsResponse.ok) {
          const n8nWorkflowsData = await n8nWorkflowsResponse.json()
          const n8nWorkflows = Array.isArray(n8nWorkflowsData) ? n8nWorkflowsData : (n8nWorkflowsData.data || [])
          
          // Look for workflow with name matching "{business_name} - STL"
          const expectedWorkflowName = `${business_name} - STL`
          const matchingWorkflow = n8nWorkflows.find((w: any) => 
            w.name === expectedWorkflowName || 
            w.name.toLowerCase() === expectedWorkflowName.toLowerCase()
          )

          if (matchingWorkflow) {
            // Return info about the existing workflow so frontend can prompt user
            return NextResponse.json({
              workflow_exists: true,
              message: `A workflow named "${matchingWorkflow.name}" already exists in n8n`,
              existing_workflow: {
                id: matchingWorkflow.id,
                name: matchingWorkflow.name,
                active: matchingWorkflow.active,
                n8n_url: `${N8N_API_URL}/workflow/${matchingWorkflow.id}`
              },
              prompt: 'Would you like to link this existing workflow to the client instead of creating a new one?'
            })
          }
        }
      } catch (error) {
        console.warn('Could not check for existing workflows in n8n:', error)
        // Continue with normal creation flow
      }
    }

    // Check if client exists, if not create it
    console.log('Checking for existing client:', business_name)
    let clientDbId = business_name
    
    // First, try to get existing client
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', business_name)
      .single()

    if (existingClient) {
      // Client exists, use it
      console.log('Using existing client:', existingClient.id)
      clientDbId = existingClient.id
      
      // Update client info in case anything changed
      const updateData: any = {
        name: business_name,
        business_name,
        owner_name,
        business_phone,
        twilio_number,
        website,
        updated_at: new Date().toISOString()
      }
      
      // Only update agency_id if it's provided
      if (agency_id) {
        updateData.agency_id = agency_id
      }
      
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', business_name)
      
      if (updateError) {
        console.warn('Warning: Failed to update client info:', updateError)
        // Continue anyway - we have the client ID
      }
    } else {
      // Client doesn't exist, create it
      console.log('Creating new client in Supabase:', business_name)
      const insertData: any = {
        id: business_name,
        name: business_name,
        business_name,
        owner_name,
        business_phone,
        twilio_number,
        website
      }
      
      // Include agency_id if provided
      if (agency_id) {
        insertData.agency_id = agency_id
      }
      
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(insertData)
        .select()
        .single()

      if (clientError) {
        console.error('Error creating client:', clientError)
        throw clientError
      }
      clientDbId = newClient.id
      console.log('Client created successfully:', clientDbId)
    }

    // If linking an existing workflow, skip creation and just link it
    if (link_existing_workflow && existing_n8n_workflow_id) {
      console.log('Linking existing n8n workflow:', existing_n8n_workflow_id)
      
      // Fetch the existing workflow from n8n to get its details
      const existingWorkflowResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${existing_n8n_workflow_id}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      })

      if (!existingWorkflowResponse.ok) {
        throw new Error(`Failed to fetch existing workflow from n8n: ${existingWorkflowResponse.statusText}`)
      }

      const existingWorkflow = await existingWorkflowResponse.json()
      
      // Extract webhooks
      const leadFormWebhook = extractLeadFormWebhook(existingWorkflow, N8N_API_URL)
      const ivrWebhook = extractIVRWebhook(existingWorkflow, N8N_API_URL)
      const n8nUrl = `${N8N_API_URL}/workflow/${existing_n8n_workflow_id}`
      const workflowName = existingWorkflow.name || `${business_name} - STL`

      // Check if workflow already exists in Supabase
      const { data: existingSupabaseWorkflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('n8n_workflow_id', existing_n8n_workflow_id)
        .single()

      let workflowRecord
      if (existingSupabaseWorkflow) {
        // Update existing record
        const { data: updated, error: updateError } = await supabase
          .from('workflows')
          .update({
            client_id: clientDbId,
            workflow_name: workflowName,
            status: existingWorkflow.active ? 'active' : 'paused',
            lead_form_webhook: leadFormWebhook || null,
            ivr_webhook: ivrWebhook || null,
            n8n_url: n8nUrl,
            updated_at: new Date().toISOString()
          })
          .eq('n8n_workflow_id', existing_n8n_workflow_id)
          .select(`
            *,
            clients (
              id,
              name,
              business_name,
              owner_name,
              business_phone,
              twilio_number
            )
          `)
          .single()

        if (updateError) throw updateError
        workflowRecord = updated
      } else {
        // Create new record in Supabase
        const { data: newWorkflow, error: workflowError } = await supabase
          .from('workflows')
          .insert({
            client_id: clientDbId,
            n8n_workflow_id: existing_n8n_workflow_id,
            workflow_name: workflowName,
            status: existingWorkflow.active ? 'active' : 'paused',
            lead_form_webhook: leadFormWebhook || null,
            ivr_webhook: ivrWebhook || null,
            n8n_url: n8nUrl
          })
          .select(`
            *,
            clients (
              id,
              name,
              business_name,
              owner_name,
              business_phone,
              twilio_number
            )
          `)
          .single()

        if (workflowError) {
          console.error('Supabase insert error:', workflowError)
          throw new Error(`Failed to link workflow in Supabase: ${workflowError.message}`)
        }
        workflowRecord = newWorkflow
      }

      return NextResponse.json({
        success: true,
        workflow: workflowRecord,
        message: 'Existing workflow linked successfully!',
        webhook_url: leadFormWebhook,
        linked_existing: true
      })
    }

    // Step 1: Fetch the template workflow from n8n
    console.log('Fetching template workflow:', TEMPLATE_WORKFLOW_ID)
    let templateWorkflow
    try {
      templateWorkflow = await fetchTemplateWorkflow(TEMPLATE_WORKFLOW_ID, N8N_API_URL, N8N_API_KEY)
      console.log('Template workflow fetched successfully')
    } catch (templateError) {
      console.error('Error fetching template workflow:', templateError)
      throw new Error(`Failed to fetch template workflow: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`)
    }
    
    // Step 2: Customize the workflow with client-specific data
    const clientData = {
      businessName: business_name,
      ownerName: owner_name,
      businessPhone: business_phone,
      twilioNumber: twilio_number,
      clientId: business_name, // id equals business_name
    }
    const customizedWorkflow = customizeWorkflow(templateWorkflow, clientData)
    
    // Clean the workflow object - only include properties n8n expects for workflow creation
    // n8n API rejects additional properties like id, versionId, createdAt, updatedAt, etc.
    // Note: 'active' and 'tags' are read-only and must be set via separate calls after creation
    // Also clean nodes - remove read-only properties like webhookId (will be generated by n8n)
    // Keep node.id as connections reference them
    const cleanedNodes = (customizedWorkflow.nodes || []).map((node: any) => {
      const cleanedNode = { ...node }
      // Remove read-only properties that n8n will generate
      delete cleanedNode.webhookId
      // Keep node.id - connections need it
      return cleanedNode
    })
    
    const workflowToCreate = {
      name: customizedWorkflow.name,
      nodes: cleanedNodes,
      connections: customizedWorkflow.connections || {},
      settings: customizedWorkflow.settings || {},
      staticData: customizedWorkflow.staticData || {},
    }
    
    // Log workflow structure for debugging (without full node details)
    console.log('Workflow to create:', {
      name: workflowToCreate.name,
      nodesCount: workflowToCreate.nodes?.length || 0,
      hasConnections: !!workflowToCreate.connections,
      hasSettings: !!workflowToCreate.settings,
      hasStaticData: !!workflowToCreate.staticData
    })
    
    // Step 3: Create the customized workflow in n8n
    console.log('Creating customized workflow in n8n:', workflowToCreate.name)
    let createWorkflowResponse
    try {
      createWorkflowResponse = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowToCreate),
      })
    } catch (fetchError) {
      console.error('Network error creating workflow:', fetchError)
      throw new Error(`Network error creating workflow: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
    }

    if (!createWorkflowResponse.ok) {
      const errorText = await createWorkflowResponse.text()
      console.error('Failed to create workflow in n8n:', errorText)
      console.error('Response status:', createWorkflowResponse.status)
      throw new Error(`Failed to create workflow in n8n: ${errorText}`)
    }

    let createdWorkflow
    try {
      createdWorkflow = await createWorkflowResponse.json()
    } catch (jsonError) {
      console.error('Error parsing workflow creation response:', jsonError)
      const responseText = await createWorkflowResponse.text()
      console.error('Response text:', responseText)
      throw new Error('Failed to parse workflow creation response')
    }
    
    const n8nWorkflowId = createdWorkflow.id
    if (!n8nWorkflowId) {
      console.error('Created workflow missing ID:', createdWorkflow)
      throw new Error('Created workflow missing ID')
    }
    console.log('Created workflow with ID:', n8nWorkflowId)

    // Step 3b: Activate the workflow using PUT to update the workflow
    // Some n8n versions use PUT /api/v1/workflows/{id} with active: true
    console.log('Activating workflow:', n8nWorkflowId)
    try {
      const activateResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflowId}`, {
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: true
        }),
      })

      if (!activateResponse.ok) {
        const errorText = await activateResponse.text()
        console.warn('Failed to activate workflow via PUT (trying POST activate endpoint):', errorText)
        
        // Fallback: Try POST /activate endpoint
        const activatePostResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflowId}/activate`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
          },
        })
        
        if (!activatePostResponse.ok) {
          const postErrorText = await activatePostResponse.text()
          console.warn('Failed to activate workflow via POST activate (workflow created but inactive):', postErrorText)
          // Don't throw - workflow was created, just not activated
        } else {
          console.log('Workflow activated successfully via POST activate endpoint')
        }
      } else {
        console.log('Workflow activated successfully via PUT')
      }
    } catch (activateError) {
      console.warn('Error activating workflow (workflow created but may be inactive):', activateError)
      // Don't throw - workflow was created successfully
    }

    // Step 4: Fetch the created workflow back to get actual webhookIds
    console.log('Fetching created workflow to extract webhooks:', n8nWorkflowId)
    let fetchWorkflowResponse
    try {
      fetchWorkflowResponse = await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflowId}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      })
    } catch (fetchError) {
      console.error('Network error fetching workflow:', fetchError)
      throw new Error(`Network error fetching workflow: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
    }

    if (!fetchWorkflowResponse.ok) {
      const errorText = await fetchWorkflowResponse.text()
      console.error('Failed to fetch created workflow from n8n:', errorText)
      throw new Error(`Failed to fetch created workflow from n8n: ${errorText}`)
    }

    let workflowData
    try {
      workflowData = await fetchWorkflowResponse.json()
    } catch (jsonError) {
      console.error('Error parsing workflow fetch response:', jsonError)
      throw new Error('Failed to parse workflow fetch response')
    }
    console.log('Workflow fetched successfully, extracting webhooks...')

    // Step 5: Extract webhook URLs from the workflow
    const leadFormWebhook = extractLeadFormWebhook(workflowData, N8N_API_URL)
    const ivrWebhook = extractIVRWebhook(workflowData, N8N_API_URL)
    const n8nUrl = `${N8N_API_URL}/workflow/${n8nWorkflowId}`
    const workflowName = `${business_name} - STL`

    console.log('Extracted webhooks:', { leadFormWebhook, ivrWebhook })

    if (!leadFormWebhook) {
      console.warn('Warning: Could not extract Lead Form webhook from created workflow')
    }

    // Step 6: Store workflow in Supabase
    console.log('Storing workflow in Supabase:', {
      client_id: clientDbId,
      n8n_workflow_id: n8nWorkflowId,
      workflow_name: workflowName
    })
    
    const { data: newWorkflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        client_id: clientDbId,
        n8n_workflow_id: n8nWorkflowId,
        workflow_name: workflowName,
        status: 'active',
        lead_form_webhook: leadFormWebhook || null,
        ivr_webhook: ivrWebhook || null,
        n8n_url: n8nUrl
      })
      .select(`
        *,
        clients (
          id,
          name,
          business_name,
          owner_name,
          business_phone,
          twilio_number
        )
      `)
      .single()

    if (workflowError) {
      console.error('Supabase insert error:', workflowError)
      console.error('Error code:', workflowError.code)
      console.error('Error message:', workflowError.message)
      console.error('Error details:', workflowError.details)
      
      // If Supabase insert fails, try to delete the workflow from n8n
      try {
        console.log('Attempting to cleanup workflow from n8n:', n8nWorkflowId)
        await fetch(`${N8N_API_URL}/api/v1/workflows/${n8nWorkflowId}`, {
          method: 'DELETE',
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
          },
        })
        console.log('Workflow deleted from n8n')
      } catch (cleanupError) {
        console.error('Failed to cleanup workflow from n8n:', cleanupError)
      }
      throw new Error(`Failed to store workflow in Supabase: ${workflowError.message} (code: ${workflowError.code})`)
    }

    if (!newWorkflow) {
      console.error('Supabase returned null workflow data')
      throw new Error('Failed to retrieve created workflow from Supabase')
    }
    
    console.log('Workflow stored successfully in Supabase:', newWorkflow.id)

    return NextResponse.json({
      success: true,
      workflow: newWorkflow,
      message: 'Workflow created successfully!',
      webhook_url: leadFormWebhook
    })

  } catch (error) {
    console.error('Error creating workflow:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}