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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-800 rounded-2xl shadow-glow border border-dark-700 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-800/95 backdrop-blur-lg z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <CogIcon className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-100">
              {agency ? 'Agency Settings' : 'Client Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors p-2 hover:bg-dark-700 rounded-lg"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              {agency ? `Agency: ${agency.name}` : `Client: ${client?.business_name}`}
            </h3>
            <p className="text-sm text-gray-400">
              {agency
                ? `Configure settings for ${agency.name} agency`
                : 'Configure agency settings for this client'
              }
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

            <div className="space-y-6">
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
                  placeholder="e.g., More Floors Marketing"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="n8n_url" className="label">
                  n8n Instance URL *
                </label>
                <input
                  type="url"
                  id="n8n_url"
                  value={agencyData.n8n_instance_url}
                  onChange={(e) => handleInputChange('n8n_instance_url', e.target.value)}
                  required
                  className="input"
                  placeholder="e.g., https://your-instance.app.n8n.cloud"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="n8n_api_key" className="label">
                  n8n API Key *
                </label>
                <input
                  type="password"
                  id="n8n_api_key"
                  value={agencyData.n8n_api_key}
                  onChange={(e) => handleInputChange('n8n_api_key', e.target.value)}
                  required
                  className="input font-mono"
                  placeholder="Enter n8n API key"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="openai_api_key" className="label">
                  OpenAI API Key *
                </label>
                <input
                  type="password"
                  id="openai_api_key"
                  value={agencyData.openai_api_key}
                  onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                  required
                  className="input font-mono"
                  placeholder="sk-..."
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="twilio_api_key" className="label">
                  Twilio API Key *
                </label>
                <input
                  type="password"
                  id="twilio_api_key"
                  value={agencyData.twilio_api_key}
                  onChange={(e) => handleInputChange('twilio_api_key', e.target.value)}
                  required
                  className="input font-mono"
                  placeholder="Enter Twilio API key"
                  disabled={loading}
                />
              </div>
            </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-6"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-6 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-dark-900 border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}