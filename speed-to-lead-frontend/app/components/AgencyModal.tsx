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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-800 rounded-2xl shadow-glow border border-dark-700 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-800/95 backdrop-blur-lg z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-100">Add New Agency</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-100 transition-colors p-2 hover:bg-dark-700 rounded-lg"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          <div className="flex justify-end space-x-3 pt-6 border-t border-dark-700">
            <button
              type="button"
              onClick={handleClose}
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
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Agency
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
