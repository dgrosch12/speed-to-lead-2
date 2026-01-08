'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  UserIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import type { Client } from '@/lib/supabase'

const DELETED_CLIENTS_KEY = 'deleted_clients'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [deletedClientIds, setDeletedClientIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load deleted client IDs from localStorage
    const stored = localStorage.getItem(DELETED_CLIENTS_KEY)
    if (stored) {
      try {
        const deletedIds = JSON.parse(stored)
        setDeletedClientIds(new Set(deletedIds))
      } catch (e) {
        console.error('Error loading deleted clients:', e)
      }
    }
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch clients')
      }
      
      setClients(data.clients)
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError(error instanceof Error ? error.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (clientId: string) => {
    if (confirm('Are you sure you want to remove this client from the view? It will remain in the database.')) {
      const newDeletedIds = new Set(deletedClientIds)
      newDeletedIds.add(clientId)
      setDeletedClientIds(newDeletedIds)
      
      // Persist to localStorage
      localStorage.setItem(DELETED_CLIENTS_KEY, JSON.stringify(Array.from(newDeletedIds)))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const visibleClients = clients.filter(client => !deletedClientIds.has(client.id))

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">
            Manage your Speed to Lead clients
          </p>
        </div>
        <Link href="/create" className="btn btn-primary flex items-center">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Client
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {visibleClients.length === 0 ? (
        <div className="text-center py-12 card">
          <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No clients yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first client to get started
          </p>
          <Link href="/create" className="btn btn-primary">
            Create Client
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleClients.map((client) => (
            <div key={client.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-gray-600">
                    Client
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove from view"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500">
                    {formatDate(client.created_at)}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {client.business_name}
              </h3>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-start">
                  <UserIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Owner</p>
                    <p className="text-gray-600">{client.owner_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <PhoneIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Business Phone</p>
                    <p className="text-gray-600">{client.business_phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <PhoneIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Twilio Number</p>
                    <p className="text-gray-600">{client.twilio_number}</p>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="font-medium text-gray-700">Client ID</p>
                  <p className="text-gray-600 font-mono text-xs">{client.client_id}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link
                  href={`/create?client_id=${client.id}`}
                  className="flex-1 btn btn-secondary text-center"
                >
                  Edit
                </Link>
                <Link
                  href={`/dashboard?client=${client.client_id}`}
                  className="flex-1 btn btn-primary text-center"
                >
                  View Workflows
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {visibleClients.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{visibleClients.length}</p>
            <p className="text-sm text-gray-600">Total Clients</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">
              {new Set(visibleClients.map(c => c.client_id)).size}
            </p>
            <p className="text-sm text-gray-600">Unique Client IDs</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-success-600">
              {visibleClients.filter(c => c.business_phone && c.twilio_number).length}
            </p>
            <p className="text-sm text-gray-600">Configured</p>
          </div>
        </div>
      )}
    </div>
  )
}

