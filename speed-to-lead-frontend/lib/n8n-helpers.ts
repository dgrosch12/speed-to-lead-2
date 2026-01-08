/**
 * Extract the Lead Form webhook URL from an n8n workflow JSON
 */
export function extractLeadFormWebhook(workflow: any, n8nApiUrl: string): string | undefined {
  try {
    const nodes = workflow.nodes || []
    
    // Find the "Lead Form" webhook node (case-insensitive)
    const leadFormNode = nodes.find(
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

    if (!leadFormNode) {
      return undefined
    }

    // Use webhookId for production URL (most reliable on n8n Cloud)
    const webhookId = leadFormNode.webhookId || leadFormNode.parameters?.path
    
    if (webhookId) {
      return `${n8nApiUrl}/webhook/${webhookId}`
    }

    return undefined
  } catch (error) {
    console.error('Error extracting webhook:', error)
    return undefined
  }
}

/**
 * Extract the IVR webhook URL from an n8n workflow JSON
 */
export function extractIVRWebhook(workflow: any, n8nApiUrl: string): string | undefined {
  try {
    const nodes = workflow.nodes || []
    
    // Find the IVR webhook node
    const ivrNode = nodes.find(
      (n: any) =>
        n?.type === 'n8n-nodes-base.webhook' &&
        (String(n?.name || '').toLowerCase().includes('ivr') ||
         String(n?.name || '').toLowerCase().includes('twiml'))
    )

    if (!ivrNode) {
      return undefined
    }

    const webhookId = ivrNode.webhookId || ivrNode.parameters?.path
    
    if (webhookId) {
      return `${n8nApiUrl}/webhook/${webhookId}`
    }

    return undefined
  } catch (error) {
    console.error('Error extracting IVR webhook:', error)
    return undefined
  }
}

/**
 * Fetch a template workflow from n8n API
 */
export async function fetchTemplateWorkflow(
  templateId: string,
  n8nApiUrl: string,
  n8nApiKey: string
): Promise<any> {
  try {
    const response = await fetch(`${n8nApiUrl}/api/v1/workflows/${templateId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch template workflow: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching template workflow:', error)
    throw error
  }
}

/**
 * Customize a template workflow with client-specific data
 */
export function customizeWorkflow(
  template: any,
  clientData: {
    businessName: string
    ownerName: string
    businessPhone: string
    twilioNumber: string
    clientId: string
  }
): any {
  // Deep clone the template to avoid reference issues
  const customized = JSON.parse(JSON.stringify(template))

  // Update workflow name
  customized.name = `${clientData.businessName} - STL`

  const nodes = customized.nodes || []

  // 1. Update "Set Lead Data + Conference name" node
  const setLeadDataNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.set' && 
    String(n?.name || '').toLowerCase().includes('set lead data')
  )
  if (setLeadDataNode?.parameters?.assignments?.assignments) {
    const assignments = setLeadDataNode.parameters.assignments.assignments
    // Update business_phone
    const businessPhoneAssignment = assignments.find(
      (a: any) => a?.name === 'business_phone'
    )
    if (businessPhoneAssignment) {
      businessPhoneAssignment.value = clientData.businessPhone
    }
    // Update twilio_number
    const twilioNumberAssignment = assignments.find(
      (a: any) => a?.name === 'twilio_number'
    )
    if (twilioNumberAssignment) {
      twilioNumberAssignment.value = clientData.twilioNumber
    }
  }

  // 2. Update "Spam Submission" node
  const spamSubmissionNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.supabase' &&
    String(n?.name || '').toLowerCase().includes('spam')
  )
  if (spamSubmissionNode?.parameters?.fieldsUi?.fieldValues) {
    const fieldValues = spamSubmissionNode.parameters.fieldsUi.fieldValues
    const clientIdField = fieldValues.find(
      (f: any) => f?.fieldId === 'client_id'
    )
    if (clientIdField) {
      clientIdField.fieldValue = clientData.clientId
    }
  }

  // 3. Update "SET BUSINESS OWNER NAME FOR CALL" node
  const setOwnerNameNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.set' &&
    String(n?.name || '').toLowerCase().includes('business owner name')
  )
  if (setOwnerNameNode?.parameters?.assignments?.assignments) {
    const assignments = setOwnerNameNode.parameters.assignments.assignments
    const ownerNameAssignment = assignments.find(
      (a: any) => a?.name === 'bizOwnerName'
    )
    if (ownerNameAssignment) {
      ownerNameAssignment.value = clientData.ownerName
    }
  }

  // 4. Update "Log supabase" node
  const logSupabaseNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.supabase' &&
    String(n?.name || '').toLowerCase().includes('log supabase')
  )
  if (logSupabaseNode?.parameters?.fieldsUi?.fieldValues) {
    const fieldValues = logSupabaseNode.parameters.fieldsUi.fieldValues
    const clientIdField = fieldValues.find(
      (f: any) => f?.fieldId === 'client_id'
    )
    if (clientIdField) {
      clientIdField.fieldValue = clientData.clientId
    }
  }

  // 5. Update "HTTP Request" node in IVR Endpoint flow
  const ivrHttpRequestNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.httpRequest' &&
    (String(n?.name || '').toLowerCase().includes('ivr') ||
     String(n?.name || '').toLowerCase().includes('endpoint'))
  )
  if (ivrHttpRequestNode?.parameters?.queryParameters?.parameters) {
    const queryParams = ivrHttpRequestNode.parameters.queryParameters.parameters
    const clientIdParam = queryParams.find(
      (p: any) => p?.name === 'client_id'
    )
    if (clientIdParam) {
      clientIdParam.value = `eq.${clientData.clientId}`
    }
  }

  // 6. Update "SET BUSINESS NAME" node
  const setBusinessNameNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.set' &&
    String(n?.name || '').toLowerCase().includes('business name') &&
    !String(n?.name || '').toLowerCase().includes('owner')
  )
  if (setBusinessNameNode?.parameters?.assignments?.assignments) {
    const assignments = setBusinessNameNode.parameters.assignments.assignments
    const businessNameAssignment = assignments.find(
      (a: any) => a?.name === 'businessName'
    )
    if (businessNameAssignment) {
      businessNameAssignment.value = clientData.businessName
    }
  }

  // 7. Update "Call the Lead + Add to Conference" node
  const callLeadNode = nodes.find(
    (n: any) => n?.type === 'n8n-nodes-base.httpRequest' &&
    (String(n?.name || '').toLowerCase().includes('call') &&
     String(n?.name || '').toLowerCase().includes('lead'))
  )
  if (callLeadNode?.parameters?.bodyParameters?.parameters) {
    const bodyParams = callLeadNode.parameters.bodyParameters.parameters
    const fromParam = bodyParams.find(
      (p: any) => p?.name === 'From'
    )
    if (fromParam) {
      fromParam.value = clientData.twilioNumber
    }
  }

  return customized
}

