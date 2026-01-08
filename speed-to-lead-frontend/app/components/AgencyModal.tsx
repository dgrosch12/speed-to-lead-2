'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { Agency } from '@/lib/supabase'

interface AgencyModalProps {
  isOpen: boolean
  onClose: () => void
  onAgencyCreated: (agency: Agency) => void
}

export default function AgencyModal({ isOpen, onClose, onAgencyCreated }: AgencyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    n8n_instance_url: '',
    n8n_api_key: '',
    openai_api_key: '',
    twilio_api_key: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.name.trim()) {
      setError('Agency name is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          n8n_instance_url: formData.n8n_instance_url.trim() || null,
          n8n_api_key: formData.n8n_api_key.trim() || null,
          openai_api_key: formData.openai_api_key.trim() || null,
          twilio_api_key: formData.twilio_api_key.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create agency')
      }

      // Reset form and close modal
      setFormData({
        name: '',
        n8n_instance_url: '',
        n8n_api_key: '',
        openai_api_key: '',
        twilio_api_key: ''
      })
      onAgencyCreated(result.agency)
      onClose()
    } catch (error) {
      console.error('Error creating agency:', error)
      setError(error instanceof Error ? error.message : 'Failed to create agency')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      n8n_instance_url: '',
      n8n_api_key: '',
      openai_api_key: '',
      twilio_api_key: ''
    })
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">Add New Agency</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="label">
              Agency Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="input"
              placeholder="e.g., More Floors Marketing"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="n8n_instance_url" className="label">
              n8n Instance URL *
            </label>
            <input
              type="url"
              id="n8n_instance_url"
              name="n8n_instance_url"
              value={formData.n8n_instance_url}
              onChange={handleInputChange}
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
              name="n8n_api_key"
              value={formData.n8n_api_key}
              onChange={handleInputChange}
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
              name="openai_api_key"
              value={formData.openai_api_key}
              onChange={handleInputChange}
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
              name="twilio_api_key"
              value={formData.twilio_api_key}
              onChange={handleInputChange}
              required
              className="input font-mono"
              placeholder="Enter Twilio API key"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
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
              {loading ? 'Creating...' : 'Create Agency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
