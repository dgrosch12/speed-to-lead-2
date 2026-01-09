'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CogIcon } from '@heroicons/react/24/outline'
import type { Client, Agency } from '@/lib/supabase'

interface ClientSettingsModalProps {
  client?: Client | null
  agency?: Agency | null
  isOpen: boolean
  onClose: () => void
  onClientUpdated: (client: Client | Agency) => void
  agencies: Agency[]
}

export default function ClientSettingsModal({
  client,
  agency,
  isOpen,
  onClose,
  onClientUpdated,
  agencies
}: ClientSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agencyData, setAgencyData] = useState({
    name: '',
    n8n_instance_url: '',
    n8n_api_key: '',
    openai_api_key: '',
    twilio_api_key: ''
  })

  useEffect(() => {
    const targetAgency = agency || client?.agency
    if (targetAgency && isOpen) {
      setAgencyData({
        name: targetAgency.name || '',
        n8n_instance_url: targetAgency.n8n_instance_url || '',
        n8n_api_key: targetAgency.n8n_api_key || '',
        openai_api_key: targetAgency.openai_api_key || '',
        twilio_api_key: targetAgency.twilio_api_key || ''
      })
    }
  }, [client, agency, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetAgency = agency || client?.agency
    if (!targetAgency) return

    setLoading(true)
    setError('')

    try {
      // Update the agency
      const response = await fetch('/api/agencies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: targetAgency.id,
          ...agencyData
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update agency settings')
      }

      const result = await response.json()
      
      // If we're editing an agency directly, return the agency
      // Otherwise, update the client with new agency data
      if (agency) {
        onClientUpdated(result.agency)
      } else if (client) {
        const updatedClient = {
          ...client,
          agency: result.agency
        }
        onClientUpdated(updatedClient)
      }
      onClose()
    } catch (error) {
      console.error('Error updating agency settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof agencyData, value: string) => {
    setAgencyData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null
  if (!client && !agency) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <CogIcon className="w-6 h-6 text-gray-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                {agency ? 'Agency Settings' : 'Client Settings'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {agency ? `Agency: ${agency.name}` : `Client: ${client?.business_name}`}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {agency 
                  ? `Configure settings for ${agency.name} agency`
                  : 'Configure agency settings for this client'
                }
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="agency_name" className="label">
                  Agency Name *
                </label>
                <input
                  type="text"
                  id="agency_name"
                  value={agencyData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="input"
                  placeholder="e.g., Contractor Kingdom"
                />
              </div>

              <div>
                <label htmlFor="n8n_url" className="label">
                  n8n Instance URL
                </label>
                <input
                  type="url"
                  id="n8n_url"
                  value={agencyData.n8n_instance_url}
                  onChange={(e) => handleInputChange('n8n_instance_url', e.target.value)}
                  className="input"
                  placeholder="e.g., https://your-instance.app.n8n.cloud"
                />
              </div>

              <div>
                <label htmlFor="n8n_api_key" className="label">
                  n8n API Key
                </label>
                <input
                  type="text"
                  id="n8n_api_key"
                  value={agencyData.n8n_api_key}
                  onChange={(e) => handleInputChange('n8n_api_key', e.target.value)}
                  className="input"
                  placeholder="Enter n8n API key"
                />
              </div>

              <div>
                <label htmlFor="openai_api_key" className="label">
                  OpenAI API Key
                </label>
                <input
                  type="text"
                  id="openai_api_key"
                  value={agencyData.openai_api_key}
                  onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                  className="input"
                  placeholder="Enter OpenAI API key"
                />
              </div>

              <div>
                <label htmlFor="twilio_api_key" className="label">
                  Twilio API Key
                </label>
                <input
                  type="text"
                  id="twilio_api_key"
                  value={agencyData.twilio_api_key}
                  onChange={(e) => handleInputChange('twilio_api_key', e.target.value)}
                  className="input"
                  placeholder="Enter Twilio API key"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}