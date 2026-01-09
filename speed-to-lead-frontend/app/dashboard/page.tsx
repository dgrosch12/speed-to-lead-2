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
  BuildingOfficeIcon,
  CogIcon,
  CheckCircleIcon,
  PauseIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import AgencyModal from '@/app/components/AgencyModal'
import ClientSettingsModal from '@/app/components/ClientSettingsModal'
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
  const [showAgencySettingsModal, setShowAgencySettingsModal] = useState(false)
  const [agencyBeingConfigured, setAgencyBeingConfigured] = useState<Agency | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {}
  }

  const handleOpenAgencySettings = (agency: Agency) => {
    console.log('Opening agency settings for:', agency.name)
    console.log('Agency object:', agency)
    setAgencyBeingConfigured(agency)
    setShowAgencySettingsModal(true)
    console.log('Modal state set to true')
  }

  const handleAgencyUpdated = (updatedAgency: Agency) => {
    setAgencies(prev => prev.map(agency => 
      agency.id === updatedAgency.id ? updatedAgency : agency
    ))
    fetchAgencies() // Refresh agencies
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
      const response = await fetch('/api/workflows')
      const data = await response.json()

      if (response.ok) {
        const clientsData = data.workflows.map((workflow: any) => ({
          ...workflow.clients,
          workflow_id: workflow.id,
          n8n_url: workflow.n8n_url,
          lead_form_webhook: workflow.lead_form_webhook,
          workflow_status: workflow.status
        }))

        setClients(clientsData)
      } else {
        setError(data.error || 'Failed to fetch clients')
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return
    }

    setDeletingClientId(clientId)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setClients(prev => prev.filter(client => client.id !== clientId))
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    } finally {
      setDeletingClientId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'paused':
        return <PauseIcon className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      default:
        return <CheckCircleIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'paused':
        return 'Paused'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Filter clients by selected agency and search query
  const q = searchQuery.trim().toLowerCase();
  
  // Filter by active agency if one is selected
  const agencyFilteredClients = activeAgencyId
    ? clients.filter(c => {
        const clientAgencyId = c.agency_id ? String(c.agency_id) : null
        const agencyId = String(activeAgencyId)
        return clientAgencyId === agencyId
      })
    : clients;
  
  // Filter by search query
  const filteredClients = q
    ? agencyFilteredClients.filter((c) => ((c.name || c.id) as string).toLowerCase().includes(q))
    : agencyFilteredClients;

  // Group clients by agency for tab counts
  const clientsByAgency = agencies.reduce((acc, agency) => {
    const agencyClients = clients.filter(c => {
      const clientAgencyId = c.agency_id ? String(c.agency_id) : null
      const agencyId = String(agency.id)
      return clientAgencyId === agencyId
    })
    acc[agency.id] = agencyClients.length
    return acc
  }, {} as Record<string, number>);

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Agency Tabs */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Agencies</h1>
          <button
            onClick={() => setShowAgencyModal(true)}
            className="w-full btn btn-primary btn-sm flex items-center justify-center"
          >
            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
            New Agency
          </button>
        </div>

        {/* Agency List */}
        <div className="flex-1 overflow-y-auto">
          {agencies.map((agency) => (
            <div
              key={agency.id}
              className={`w-full border-b border-gray-200 transition-colors ${
                activeAgencyId === agency.id 
                  ? 'bg-primary-50 border-primary-200 text-primary-900' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between p-4">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => setActiveAgencyId(agency.id)}
                >
                  <h3 className="font-medium">{agency.name}</h3>
                  <p className="text-sm text-gray-500">
                    {clientsByAgency[agency.id] || 0} clients
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleOpenAgencySettings(agency)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Agency Settings"
                  >
                    <CogIcon className="w-4 h-4" />
                  </button>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activeAgencyId === agency.id 
                      ? 'bg-primary-100 text-primary-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {clientsByAgency[agency.id] || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Client Cards */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {agencies.find(a => a.id === activeAgencyId)?.name || 'Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                {filteredClients.length} clients
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/create" className="btn btn-primary flex items-center">
                <PlusIcon className="w-4 h-4 mr-2" />
                New Client
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading clients...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? "No clients match your search criteria."
                  : activeAgencyId 
                    ? "This agency doesn't have any clients yet."
                    : "Get started by creating your first client."
                }
              </p>
              <Link href="/create" className="btn btn-primary">
                Create Client
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                <div key={client.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {client.business_name || client.name || 'Unknown Business'}
                      </h3>
                      {client.owner_name && (
                        <p className="text-gray-600 text-sm">{client.owner_name}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        disabled={deletingClientId === client.id}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete Client"
                      >
                        {deletingClientId === client.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.business_phone && (
                      <div className="flex items-center">
                        <PhoneIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-gray-600">{client.business_phone}</span>
                      </div>
                    )}
                    {client.twilio_number && (
                      <div className="flex items-center">
                        <PhoneIcon className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-gray-600">Twilio: {client.twilio_number}</span>
                      </div>
                    )}
                    {client.workflow_status && (
                      <div className="flex items-center">
                        {getStatusIcon(client.workflow_status)}
                        <span className="ml-2 text-gray-600">
                          {getStatusText(client.workflow_status)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-col space-y-3">
                      <span className="text-xs text-gray-500">
                        Created {formatDate(client.created_at)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {client.lead_form_webhook && (
                          <button
                            onClick={() => copyToClipboard(client.lead_form_webhook!, `webhook-${client.id}`)}
                            className="btn btn-secondary btn-xs flex items-center"
                            title="Copy webhook URL"
                          >
                            <ClipboardDocumentIcon className="w-3 h-3 mr-1" />
                            {copiedId === `webhook-${client.id}` ? 'Copied!' : 'Webhook'}
                          </button>
                        )}
                        {client.workflow_id ? (
                          <Link
                            href={`/workflow/${client.workflow_id}`}
                            className="btn btn-primary btn-xs"
                          >
                            View Details
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">No workflow</span>
                        )}
                        {client.n8n_url && (
                          <a
                            href={client.n8n_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-xs flex items-center"
                          >
                            <ExternalLinkIcon className="w-3 h-3 mr-1" />
                            n8n
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AgencyModal
        isOpen={showAgencyModal}
        onClose={() => setShowAgencyModal(false)}
        onAgencyCreated={handleAgencyCreated}
      />

      <ClientSettingsModal
        isOpen={showAgencySettingsModal}
        onClose={() => {
          console.log('Closing agency settings modal')
          setShowAgencySettingsModal(false)
        }}
        client={null}
        agency={agencyBeingConfigured}
        agencies={agencies}
        onClientUpdated={handleAgencyUpdated}
      />
    </div>
  )
}