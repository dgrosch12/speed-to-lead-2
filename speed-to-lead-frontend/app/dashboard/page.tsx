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
  TrashIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import AgencyModal from '@/app/components/AgencyModal'
import type { Client, Agency } from '@/lib/supabase'

interface ClientWithWorkflow extends Client {
  n8n_url?: string
  workflow_id?: string
  lead_form_webhook?: string
  workflow_status?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithWorkflow[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [activeAgencyId, setActiveAgencyId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [showAgencyModal, setShowAgencyModal] = useState(false)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  useEffect(() => {
    console.log('Dashboard component mounted, clearing any cached data and fetching fresh...')
    
    // Clear any potential browser storage that might contain stale client data
    try {
      localStorage.removeItem('clients')
      sessionStorage.removeItem('clients')
    } catch (e) {
      // Storage might not be available, ignore
    }
    
    fetchAgencies()
    fetchClients()
  }, [])

  // Set active agency when agencies are loaded
  useEffect(() => {
    if (agencies.length > 0 && !activeAgencyId) {
      const firstAgencyId = agencies[0].id
      console.log('Setting active agency from useEffect:', firstAgencyId, agencies[0].name)
      setActiveAgencyId(firstAgencyId)
    }
  }, [agencies, activeAgencyId])

  // Refresh clients when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing data...')
        fetchClients()
        fetchAgencies()
      }
    }

    const handleFocus = () => {
      console.log('Window focused, refreshing data...')
      fetchClients()
      fetchAgencies()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchAgencies = async () => {
    try {
      const response = await fetch('/api/agencies')
      const result = await response.json()
      if (response.ok) {
        const agenciesList = result.agencies || []
        console.log('Fetched agencies:', agenciesList)
        setAgencies(agenciesList)
        // Set first agency as active if none selected
        if (agenciesList.length > 0) {
          // Always set to first agency if not set, or if current activeAgencyId doesn't exist in list
          const currentAgencyExists = activeAgencyId && agenciesList.some(a => a.id === activeAgencyId)
          if (!activeAgencyId || !currentAgencyExists) {
            const firstAgencyId = agenciesList[0].id
            console.log('Setting active agency to:', firstAgencyId, agenciesList[0].name)
            setActiveAgencyId(firstAgencyId)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
    }
  }

  const handleAgencyCreated = (agency: Agency) => {
    setAgencies(prev => [...prev, agency])
    setActiveAgencyId(agency.id)
    // Refresh clients to show any clients for the new agency
    fetchClients()
  }

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Clear existing clients state immediately
      setClients([])
      
      console.log('🔄 Fetching ALL clients from Supabase...')
      
      // Simple fetch with cache busting - no overengineering
      const response = await fetch(`/api/clients?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }
      
      const data = await response.json()
      const clients = data.clients || []
      
      console.log(`📋 Found ${clients.length} clients in Supabase:`)
      clients.forEach((client: any, index: number) => {
        console.log(`  ${index + 1}. ${client.name || client.id}`)
      })
      
      // Fetch workflows to enrich client data  
      const workflowResponse = await fetch(`/api/workflows?t=${Date.now()}`, {
        cache: 'no-store'
      }).catch(() => ({ ok: false, json: () => ({ workflows: [] }) }))
      
      let workflows: any[] = []
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json()
        workflows = workflowData.workflows || []
      }
      
      // Add workflow info to clients
      const clientsWithWorkflows = clients.map((client: any) => {
        const workflow = workflows.find((w: any) => w.client_id === client.id)
        if (workflow) {
          return {
            ...client,
            workflow_id: workflow.id,
            workflow_status: workflow.status,
            n8n_url: workflow.n8n_url,
            lead_form_webhook: workflow.lead_form_webhook,
            ivr_webhook: workflow.ivr_webhook
          }
        }
        return client
      })
      
      // Set the clients state - this is the ONLY source of what gets displayed
      setClients(clientsWithWorkflows)
      console.log('✅ Dashboard updated with current Supabase data')
      
    } catch (error) {
      console.error('❌ Error fetching clients:', error)
      setError('Failed to load clients')
      setClients([])
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
    if (!confirm(`Are you sure you want to delete "${clientName}"? This will remove the client and all associated workflows from Supabase.`)) {
      return
    }

    setDeletingClientId(clientId)
    setError('')

    try {
      // Delete from Supabase
      const response = await fetch(`/api/clients/${clientId}?t=${new Date().getTime()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        // If client not found, refresh the list anyway to remove it from UI
        if (response.status === 404 || data.error?.includes('not found') || data.error?.includes('Not found')) {
          console.warn(`Client "${clientName}" (${clientId}) not found in Supabase - refreshing list to remove from UI`)
          await fetchClients()
          setError(`"${clientName}" was not found in Supabase and has been removed from the dashboard.`)
          setTimeout(() => setError(''), 5000)
          return
        }
        throw new Error(data.error || 'Failed to delete client')
      }

      console.log(`✅ Successfully deleted client "${clientName}" (${clientId})`)
      
      // Brief delay to ensure database transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Refresh clients list after successful deletion to ensure UI matches Supabase
      await fetchClients()
    } catch (error) {
      console.error('Error deleting client:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete client')
      // Brief delay and refresh list anyway in case the client was already deleted
      await new Promise(resolve => setTimeout(resolve, 100))
      await fetchClients()
    } finally {
      setDeletingClientId(null)
    }
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
  
  // Filter by active agency if one is selected
  const agencyFilteredClients = activeAgencyId
    ? clients.filter(c => {
        const clientAgencyId = c.agency_id ? String(c.agency_id) : null
        const activeId = String(activeAgencyId)
        return clientAgencyId === activeId
      })
    : clients
  
  // Filter by search query
  const filteredClients = q
    ? agencyFilteredClients.filter((c) => ((c.name || c.id) as string).toLowerCase().includes(q))
    : agencyFilteredClients

  // Group clients by agency for tab counts
  const clientsByAgency = agencies.reduce((acc, agency) => {
    const agencyClients = clients.filter(c => {
      const clientAgencyId = c.agency_id ? String(c.agency_id) : null
      const agencyId = String(agency.id)
      return clientAgencyId === agencyId
    })
    acc[agency.id] = agencyClients.length
    return acc
  }, {} as Record<string, number>)

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
          <button
            onClick={() => setShowAgencyModal(true)}
            className="btn btn-secondary flex items-center"
          >
            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
            New Agency
          </button>
          <Link href="/create" className="btn btn-primary flex items-center">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Client
          </Link>
        </div>
      </div>

      {/* Agency Tabs */}
      {agencies.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {agencies.map((agency) => {
              const clientCount = clientsByAgency[agency.id] || 0
              const isActive = activeAgencyId === agency.id
              return (
                <button
                  key={agency.id}
                  onClick={() => setActiveAgencyId(agency.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      isActive
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {agency.name}
                  {clientCount > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      isActive
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {clientCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      )}

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
          {filteredClients.map((client) => {
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

      <AgencyModal
        isOpen={showAgencyModal}
        onClose={() => setShowAgencyModal(false)}
        onAgencyCreated={handleAgencyCreated}
      />
    </div>
  )
}