'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon, 
  PhoneIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Client } from '@/lib/supabase'

interface ClientWithWorkflow extends Client {
  n8n_url?: string
  workflow_id?: string
  lead_form_webhook?: string
  workflow_status?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithWorkflow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  // Persist deleted IDs in localStorage so they don't come back on refresh
  const [deletedClientIds, setDeletedClientIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deletedClientIds')
      if (saved) {
        try {
          return new Set(JSON.parse(saved))
        } catch (e) {
          return new Set()
        }
      }
    }
    return new Set()
  })
  
  // Update localStorage whenever deletedClientIds changes
  const updateDeletedClientIds = (updater: (prev: Set<string>) => Set<string>) => {
    setDeletedClientIds(prev => {
      const newSet = updater(prev)
      if (typeof window !== 'undefined') {
        localStorage.setItem('deletedClientIds', JSON.stringify(Array.from(newSet)))
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      // Fetch clients, workflows from Supabase, and n8n workflows in parallel
      // Add cache: 'no-store' and timestamp to force fresh data
      const timestamp = new Date().getTime()
      const fetchOptions = { 
        cache: 'no-store' as RequestCache,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
      const [clientsResponse, supabaseWorkflowsResponse, n8nWorkflowsResponse] = await Promise.all([
        fetch(`/api/clients?t=${timestamp}`, fetchOptions),
        fetch(`/api/workflows?t=${timestamp}`, fetchOptions).catch(() => ({ ok: false, json: () => ({ workflows: [] }) })),
        fetch(`/api/n8n/workflows?t=${timestamp}`, fetchOptions).catch(() => ({ ok: false, json: () => ({ workflows: [] }) }))
      ])
      
      const clientsData = await clientsResponse.json()
      const supabaseWorkflowsData = await supabaseWorkflowsResponse.json()
      const n8nWorkflowsData = await n8nWorkflowsResponse.json()
      
      if (!clientsResponse.ok) {
        throw new Error(clientsData.error || 'Failed to fetch clients')
      }
      
      // Log exactly what we received from the API
      const rawClients = clientsData.clients || []
      console.log('=== DASHBOARD CLIENT FETCH ===')
      console.log('Raw clients received from Supabase API:', rawClients.length)
      console.log('Client IDs received:', rawClients.map((c: any) => c.id || c.name || 'NO-ID'))
      
      // VALIDATE: Filter out any invalid clients (missing id or name)
      const validClients = rawClients.filter((c: any) => {
        if (!c.id && !c.name) {
          console.warn('Filtering out invalid client (no id or name):', c)
          return false
        }
        
        // Explicitly filter out Grosch HVAC if it somehow appears
        const isGrosch = (c.id && c.id.toLowerCase().includes('grosch')) || 
                        (c.name && c.name.toLowerCase().includes('grosch'))
        if (isGrosch) {
          console.error('⚠️ Filtering out Grosch HVAC - should not be in Supabase:', c)
          return false
        }
        
        return true
      })
      
      if (validClients.length !== rawClients.length) {
        console.warn(`Filtered out ${rawClients.length - validClients.length} invalid clients`)
      }
      
      // CRITICAL: Only show clients that exist in Supabase
      // Do NOT create clients from n8n workflows - only show what's in the clients table
      if (validClients.length === 0) {
        console.log('No valid clients found in Supabase')
        setClients([])
        setLoading(false)
        return
      }
      
      // Get workflows from Supabase (preferred source for webhook URLs)
      const supabaseWorkflows = supabaseWorkflowsData.workflows || []
      console.log('Supabase workflows:', supabaseWorkflows.map((w: any) => ({ 
        id: w.id, 
        client_id: w.client_id, 
        workflow_name: w.workflow_name 
      })))
      
      // Get workflows from n8n (only for webhook extraction, NOT for creating clients)
      const n8nWorkflows = n8nWorkflowsData.workflows || []
      
      // Specific mappings for known clients (override automatic matching)
      const clientWorkflowMap: Record<string, string> = {
        'High Caliber': 'vc044ImIQ6wrSFyD',
        // Add more specific mappings here if needed
      }
      
      // Match workflows to clients by name
      // IMPORTANT: ONLY process clients that exist in Supabase - never create clients from n8n workflows
      const clientsWithWorkflows = validClients.map((client: Client) => {
        const clientName = (client.name || client.id).toLowerCase()
        const clientId = client.id
        
        // First, check if we have workflows in Supabase for this client
        // Find ALL workflows for this client (there might be duplicates)
        const matchingWorkflows = supabaseWorkflows.filter((w: any) => {
          // Match by client_id (exact match) - this is the primary matching method
          if (w.client_id === clientId) {
            return true
          }
          // Match by workflow name containing client name
          if (w.workflow_name && clientName) {
            const workflowNameLower = w.workflow_name.toLowerCase()
            // Check if workflow name starts with client name (e.g., "Sub Thermal H&C - STL" starts with "sub thermal h&c")
            if (workflowNameLower.startsWith(clientName) || workflowNameLower.includes(clientName)) {
              return true
            }
          }
          return false
        })
        
        // If multiple workflows found, prefer active ones, then most recent
        let supabaseWorkflow = null
        if (matchingWorkflows.length > 0) {
          if (matchingWorkflows.length > 1) {
            console.warn(`Multiple workflows found for client ${clientId}:`, matchingWorkflows.map((w: any) => ({ id: w.id, status: w.status, created_at: w.created_at })))
          }
          
          // Sort: active first, then by created_at (most recent first)
          const sorted = matchingWorkflows.sort((a: any, b: any) => {
            // Active workflows first
            if (a.status === 'active' && b.status !== 'active') return -1
            if (a.status !== 'active' && b.status === 'active') return 1
            // Then by created_at (most recent first)
            const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
            const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
            return bDate - aDate
          })
          
          supabaseWorkflow = sorted[0]
          console.log(`Matched ${clientId} to workflow ${supabaseWorkflow.id} (status: ${supabaseWorkflow.status}, chosen from ${matchingWorkflows.length} workflows)`)
        }
        
        if (supabaseWorkflow) {
          // Use Supabase workflow data (most reliable - has correct webhook URLs)
          // Include workflow even if lead_form_webhook is missing (it might be extracted later)
          return {
            ...client,
            n8n_url: supabaseWorkflow.n8n_url,
            workflow_id: supabaseWorkflow.id, // Use Supabase UUID for workflow detail page
            workflow_name: supabaseWorkflow.workflow_name,
            workflow_status: supabaseWorkflow.status, // Include workflow status
            lead_form_webhook: supabaseWorkflow.lead_form_webhook || null,
            ivr_webhook: supabaseWorkflow.ivr_webhook || null
          }
        }
        
        console.log(`No Supabase workflow found for client ${clientId} (${clientName})`)
        
        // Only match workflows if client exists in Supabase (we already know it does since we're in rawClients)
        // Fallback: Check for specific mapping (only for known clients)
        const specificWorkflowId = clientWorkflowMap[client.name || client.id]
        if (specificWorkflowId) {
          const specificWorkflow = n8nWorkflows.find((w: any) => w.id === specificWorkflowId)
          if (specificWorkflow) {
            return {
              ...client,
              n8n_url: specificWorkflow.n8n_url,
              workflow_id: specificWorkflow.id, // Use n8n ID - API will handle it
              workflow_name: specificWorkflow.name,
              lead_form_webhook: specificWorkflow.lead_form_webhook
            }
          }
        }
        
        // Fallback: Try to find a matching workflow by name in n8n (only if client exists in Supabase)
        const matchingWorkflow = n8nWorkflows.find((workflow: any) => {
          const workflowName = workflow.name.toLowerCase()
          
          // Check if workflow name contains client name (e.g., "High Caliber - STL" contains "High Caliber")
          // Or if client name contains workflow name
          return workflowName.includes(clientName) || 
                 clientName.includes(workflowName.split(' - ')[0]) ||
                 workflowName.includes(clientName.split(' ')[0]) // Match first word
        })
        
        if (matchingWorkflow) {
          return {
            ...client,
            n8n_url: matchingWorkflow.n8n_url,
            workflow_id: matchingWorkflow.id, // Use n8n ID - API will handle it
            workflow_name: matchingWorkflow.name,
            lead_form_webhook: matchingWorkflow.lead_form_webhook
          }
        }
        
        // Return client as-is (it exists in Supabase, just no workflow)
        return client
      })
      
      console.log('Final clients array length:', clientsWithWorkflows.length)
      console.log('Final client IDs:', clientsWithWorkflows.map((c: any) => c.id || c.name || 'NO-ID'))
      
      // Final validation: Only set clients that have valid IDs and exist in rawClients
      // This prevents showing clients that were somehow created from n8n workflows
      // Also filter out any clients that have been marked as deleted (from localStorage)
      // BUT: If a client exists in Supabase but is marked as deleted, remove it from deleted list (it was recreated)
      const currentDeletedIds = new Set<string>()
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('deletedClientIds')
        if (saved) {
          try {
            JSON.parse(saved).forEach((id: string) => currentDeletedIds.add(id))
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      // Check if any clients in Supabase are marked as deleted - only remove from deleted list if:
      // 1. The client was created recently (within last 5 minutes) - indicates it was recreated
      // 2. OR the client has a workflow - indicates it was properly recreated with a workflow
      // This prevents removing from deleted list if the delete API call is still in progress
      const idsToRemoveFromDeleted: string[] = []
      const now = Date.now()
      const fiveMinutesAgo = now - (5 * 60 * 1000)
      
      rawClients.forEach((rc: any) => {
        if (currentDeletedIds.has(rc.id)) {
          const createdAt = rc.created_at ? new Date(rc.created_at).getTime() : 0
          const wasCreatedRecently = createdAt > fiveMinutesAgo
          
          // Check if client has a workflow in Supabase (indicates proper recreation)
          const hasWorkflow = supabaseWorkflows.some((w: any) => w.client_id === rc.id)
          
          if (wasCreatedRecently || hasWorkflow) {
            console.log(`✅ Client ${rc.id} exists in Supabase and was ${wasCreatedRecently ? 'recently created' : 'has workflow'} - removing from deleted list (recreated)`)
            idsToRemoveFromDeleted.push(rc.id)
          } else {
            console.log(`🚫 Client ${rc.id} exists in Supabase but was NOT recently created and has no workflow - keeping in deleted list (delete may be in progress)`)
          }
        }
      })
      
      // Remove recreated clients from deleted list
      if (idsToRemoveFromDeleted.length > 0) {
        updateDeletedClientIds(prev => {
          const updated = new Set(prev)
          idsToRemoveFromDeleted.forEach(id => updated.delete(id))
          return updated
        })
        idsToRemoveFromDeleted.forEach(id => currentDeletedIds.delete(id))
      }
      
      const validatedClients = clientsWithWorkflows.filter(client => {
        const existsInSupabase = rawClients.some(rc => rc.id === client.id)
        const isDeleted = currentDeletedIds.has(client.id)
        
        // CRITICAL: Never show a client if it's marked as deleted, even if it exists in Supabase
        // (The delete API call might still be in progress, or there might be a sync issue)
        if (isDeleted) {
          console.log(`🚫 BLOCKING client ${client.id} - marked as deleted in localStorage (will not show even if in Supabase)`)
          return false
        }
        
        if (!existsInSupabase) {
          console.warn(`⚠️ Filtering out client ${client.id} - not in Supabase response`)
          return false
        }
        
        return true
      })
      
      if (validatedClients.length !== clientsWithWorkflows.length) {
        console.warn(`Filtered out ${clientsWithWorkflows.length - validatedClients.length} clients not in Supabase`)
      }
      
      console.log('==============================')
      
      // Set clients - they will be filtered by deletedClientIds in the render
      setClients(validatedClients)
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError(error instanceof Error ? error.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    // Confirm deletion first
    if (!confirm(`Are you sure you want to remove "${clientName}" from the dashboard?`)) {
      return
    }

    // IMMEDIATELY remove from UI and mark as deleted
    console.log('🗑️ Removing client from UI immediately:', clientId)
    console.log('Current clients state:', clients.map(c => ({ id: c.id, name: c.name })))
    console.log('Current deletedClientIds:', Array.from(deletedClientIds))
    
    // Add to deleted set FIRST to prevent it from reappearing (persisted to localStorage)
    updateDeletedClientIds(prev => {
      const updated = new Set(prev)
      updated.add(clientId)
      console.log('✅ Added to deleted set (persisted):', Array.from(updated))
      return updated
    })
    
    // Remove from clients state IMMEDIATELY
    setClients(prevClients => {
      const before = prevClients.length
      const filtered = prevClients.filter(c => {
        const matches = c.id === clientId
        if (matches) {
          console.log('Removing client:', { id: c.id, name: c.name })
        }
        return !matches
      })
      console.log(`✅ Removed from clients state. Before: ${before}, After: ${filtered.length}`)
      console.log('Remaining clients:', filtered.map(c => ({ id: c.id, name: c.name })))
      return filtered
    })
    
    setDeletingClientId(clientId)
    setError('')
    
    // Force a re-render
    setTimeout(() => {
      console.log('Force checking deletedClientIds after update:', Array.from(deletedClientIds))
    }, 100)

    // Then try to delete from Supabase (but don't wait for it)
    // If it doesn't exist, that's fine - we already removed it from UI

    // Try to delete from Supabase in the background (non-blocking)
    // We've already removed it from UI, so this is just cleanup
    fetch(`/api/clients/${clientId}?t=${new Date().getTime()}`, {
      method: 'DELETE',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
      .then(async (response) => {
        const data = await response.json()
        if (response.ok) {
          console.log('✅ Client deleted from Supabase:', data)
          // Don't refresh - we've already removed it from UI and it's deleted from Supabase
          // Only refresh if there was an error
        } else if (response.status === 404) {
          console.log('ℹ️ Client not found in Supabase (already deleted)')
          // Don't refresh - client is already gone
        } else {
          console.error('❌ Error deleting from Supabase:', data.error)
          // Only refresh on error to see if we need to sync state
          setTimeout(() => fetchClients(), 500)
        }
      })
      .catch((error) => {
        console.error('❌ Error calling delete API:', error)
        // Only refresh on error to see if we need to sync state
        setTimeout(() => fetchClients(), 500)
      })
      .finally(() => {
        setDeletingClientId(null)
      })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading clients...</p>
      </div>
    )
  }

  const q = searchQuery.trim().toLowerCase()
  // Filter out deleted clients from display
  const activeClients = clients.filter(c => !deletedClientIds.has(c.id))
  const filteredClients = q
    ? activeClients.filter((c) => ((c.name || c.id) as string).toLowerCase().includes(q))
    : activeClients

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your Speed to Lead clients
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative w-64">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="input pl-9"
            />
          </div>
          <Link href="/create" className="btn btn-primary flex items-center">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Client
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {filteredClients.length === 0 ? (
        <div className="text-center py-12 card">
          <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {q ? 'No clients match your search' : 'No clients yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {q ? 'Try a different search term' : 'Create your first Speed to Lead client to get started'}
          </p>
          {!q && (
            <Link href="/create" className="btn btn-primary">
              Create Client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients
            .filter(client => {
              // Double-check: don't render if marked as deleted
              if (deletedClientIds.has(client.id)) {
                console.log('🚫 Skipping render for deleted client:', client.id)
                return false
              }
              return true
            })
            .map((client) => {
            const cardContent = (
              <>
                <div className="flex items-start justify-between mb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClient(client.id, client.name || client.id)
                    }}
                    disabled={deletingClientId === client.id}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete client"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500">
                    {formatDate(client.created_at)}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {client.name || client.id}
                </h3>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Status</span>
                    {client.workflow_status ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        client.workflow_status === 'active' 
                          ? 'bg-success-50 text-success-600' 
                          : client.workflow_status === 'paused'
                          ? 'bg-warning-50 text-warning-600'
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                        {client.workflow_status === 'active' ? 'Active' : client.workflow_status === 'paused' ? 'Paused' : client.workflow_status}
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        client.status === 'Active' 
                          ? 'bg-success-50 text-success-600' 
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                        {client.status || 'Active'}
                      </span>
                    )}
                  </div>
                  
                  {client.phone_number && (
                    <div className="flex items-start">
                      <PhoneIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">Phone</p>
                        <p className="text-gray-600">
                          {client.area_code && client.phone_number 
                            ? `${client.area_code} ${client.phone_number}`
                            : client.phone_number || 'Not set'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lead form webhook with copy - shown above action buttons */}
                {client.lead_form_webhook && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-500">Lead Form Webhook</p>
                      <button
                        onClick={() => copyToClipboard(client.lead_form_webhook!, client.id as string)}
                        className="btn btn-secondary text-xs flex items-center"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                        {copiedId === client.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 font-mono break-all">
                      {client.lead_form_webhook}
                    </p>
                  </div>
                )}

                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  {/* View Details button (internal) */}
                  {client.workflow_id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/workflow/${client.workflow_id}`)
                      }}
                      className="flex-1 btn btn-secondary text-center"
                    >
                      View Details
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 btn btn-secondary text-center opacity-50 cursor-not-allowed"
                      title="No workflow data available"
                    >
                      No Workflow
                    </button>
                  )}
                  {/* Open in n8n (external) */}
                  {client.n8n_url ? (
                    <a
                      href={client.n8n_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn btn-primary text-center flex items-center justify-center"
                    >
                      <ExternalLinkIcon className="w-4 h-4 mr-1" />
                      Open in n8n
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 btn btn-secondary text-center opacity-50 cursor-not-allowed"
                      title="No workflow found for this client"
                    >
                      No Workflow
                    </button>
                  )}
                </div>
              </>
            )

            // Use a stable key that combines id and name to ensure React properly tracks the card
            const cardKey = `${client.id}-${client.name || ''}-${client.created_at || ''}`
            
            // If client has a workflow, make the entire card clickable
            if (client.workflow_id) {
              return (
                <div
                  key={cardKey}
                  data-client-id={client.id}
                  onClick={() => router.push(`/workflow/${client.workflow_id}`)}
                  className="card hover:shadow-md transition-shadow cursor-pointer"
                >
                  {cardContent}
                </div>
              )
            }

            // Otherwise, render as a regular card
            return (
              <div 
                key={cardKey} 
                data-client-id={client.id}
                className="card hover:shadow-md transition-shadow"
              >
                {cardContent}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      {clients.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-900">
              {clients.length}
            </p>
            <p className="text-sm text-gray-600">Total Clients</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">
              {clients.filter(c => c.status === 'Active').length}
            </p>
            <p className="text-sm text-gray-600">Active Clients</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-success-600">
              {clients.reduce((sum, c) => sum + (c.workflows || 0), 0)}
            </p>
            <p className="text-sm text-gray-600">Total Workflows</p>
          </div>
        </div>
      )}
    </div>
  )
}