'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateWorkflowPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    business_phone: '',
    twilio_number: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingWorkflow, setExistingWorkflow] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setExistingWorkflow(null)

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      // Check if an existing workflow was found
      if (result.workflow_exists) {
        setExistingWorkflow(result.existing_workflow)
        setLoading(false)
        return // Don't proceed, wait for user to confirm
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create workflow')
      }

      // Redirect to the new workflow detail page
      router.push(`/workflow/${result.workflow.id}`)
    } catch (error) {
      console.error('Error creating workflow:', error)
      setError(error instanceof Error ? error.message : 'Failed to create workflow')
      setLoading(false)
    }
  }

  const handleLinkExisting = async () => {
    if (!existingWorkflow) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          link_existing_workflow: true,
          existing_n8n_workflow_id: existingWorkflow.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link workflow')
      }

      // Redirect to the workflow detail page
      router.push(`/workflow/${result.workflow.id}`)
    } catch (error) {
      console.error('Error linking workflow:', error)
      setError(error instanceof Error ? error.message : 'Failed to link workflow')
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    setExistingWorkflow(null)
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          force_create: true // Skip checking for existing workflows
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create workflow')
      }

      // Redirect to the new workflow detail page
      router.push(`/workflow/${result.workflow.id}`)
    } catch (error) {
      console.error('Error creating workflow:', error)
      setError(error instanceof Error ? error.message : 'Failed to create workflow')
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Create New Speed to Lead Workflow
        </h1>
        <p className="text-gray-600">
          Enter your client's information to generate a complete Speed to Lead automation workflow.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {existingWorkflow && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Workflow Found in n8n
          </h3>
          <p className="text-blue-800 mb-3">
            A workflow named <strong>"{existingWorkflow.name}"</strong> already exists in n8n.
          </p>
          <div className="mb-4 text-sm text-blue-700">
            <p><strong>Workflow ID:</strong> {existingWorkflow.id}</p>
            <p><strong>Status:</strong> {existingWorkflow.active ? 'Active' : 'Paused'}</p>
          </div>
          <p className="text-blue-800 mb-4">
            Would you like to link this existing workflow to the client instead of creating a new one?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleLinkExisting}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Linking...' : 'Yes, Link Existing Workflow'}
            </button>
            <button
              onClick={handleCreateNew}
              disabled={loading}
              className="btn btn-secondary"
            >
              No, Create New Workflow
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="business_name" className="label">
              Business Name *
            </label>
            <input
              type="text"
              id="business_name"
              name="business_name"
              value={formData.business_name}
              onChange={handleInputChange}
              required
              className="input"
              placeholder="e.g., High Caliber HVAC"
            />
          </div>

          <div>
            <label htmlFor="owner_name" className="label">
              Owner Name *
            </label>
            <input
              type="text"
              id="owner_name"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleInputChange}
              required
              className="input"
              placeholder="e.g., Chris Johnson"
            />
          </div>

          <div>
            <label htmlFor="business_phone" className="label">
              Business Phone *
            </label>
            <input
              type="tel"
              id="business_phone"
              name="business_phone"
              value={formData.business_phone}
              onChange={handleInputChange}
              required
              className="input"
              placeholder="e.g., +12547021243"
            />
          </div>

          <div>
            <label htmlFor="twilio_number" className="label">
              Twilio Number *
            </label>
            <input
              type="tel"
              id="twilio_number"
              name="twilio_number"
              value={formData.twilio_number}
              onChange={handleInputChange}
              required
              className="input"
              placeholder="e.g., +12544101386"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Workflow'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}