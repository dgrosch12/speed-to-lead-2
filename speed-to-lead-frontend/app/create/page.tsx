'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AgencyModal from '@/app/components/AgencyModal'
import type { Agency } from '@/lib/supabase'

export default function CreateWorkflowPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    business_phone: '',
    twilio_number: '',
    website: '',
    agency_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingWorkflow, setExistingWorkflow] = useState<any>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loadingAgencies, setLoadingAgencies] = useState(true)
  const [showAgencyModal, setShowAgencyModal] = useState(false)

  // Fetch agencies on component mount
  useEffect(() => {
    fetchAgencies()
  }, [])

  const fetchAgencies = async () => {
    try {
      const response = await fetch('/api/agencies')
      const result = await response.json()
      if (response.ok) {
        setAgencies(result.agencies || [])
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
    } finally {
      setLoadingAgencies(false)
    }
  }

  const handleAgencyCreated = (agency: Agency) => {
    setAgencies(prev => [...prev, agency])
    setFormData(prev => ({ ...prev, agency_id: agency.id }))
  }

  // Convert phone number to E.164 format (+1XXXXXXXXXX)
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ''
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // If it's already in +1XXXXXXXXXX format, return as is
    if (phone.startsWith('+1') && digits.length === 11) {
      return phone
    }
    
    // If it starts with +1, extract the digits after +1
    if (phone.startsWith('+1')) {
      const cleanDigits = digits.substring(1) // Remove the leading 1
      if (cleanDigits.length === 10) {
        return `+1${cleanDigits}`
      }
    }
    
    // If it's 10 digits, add +1
    if (digits.length === 10) {
      return `+1${digits}`
    }
    
    // If it's 11 digits and starts with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`
    }
    
    // If it's already in correct format, return as is
    if (phone.startsWith('+') && digits.length === 11) {
      return phone
    }
    
    // Return the original if we can't format it
    return phone
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setExistingWorkflow(null)

    // Format phone numbers before submitting
    const formattedData: any = {
      ...formData,
      business_phone: formatPhoneNumber(formData.business_phone),
      twilio_number: formatPhoneNumber(formData.twilio_number),
    }
    
    // Log what we're sending
    console.log('Creating client with data:', formattedData)
    
    // Only include agency_id if it's set
    if (!formattedData.agency_id) {
      console.warn('⚠️ No agency_id provided - client will be created without an agency')
      delete formattedData.agency_id
    } else {
      console.log('✅ Agency ID included:', formattedData.agency_id)
    }

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
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

      // Redirect to the workflow detail page to see the new client's workflow
      if (result.workflow?.id) {
        window.location.href = `/workflow/${result.workflow.id}` // Show the new workflow details
      } else {
        // Fallback to dashboard if no workflow ID
        window.location.href = '/dashboard'
      }
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
          business_phone: formatPhoneNumber(formData.business_phone),
          twilio_number: formatPhoneNumber(formData.twilio_number),
          agency_id: formData.agency_id || undefined,
          link_existing_workflow: true,
          existing_n8n_workflow_id: existingWorkflow.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link workflow')
      }

      // Redirect to the workflow detail page to see the linked workflow
      if (result.workflow?.id) {
        window.location.href = `/workflow/${result.workflow.id}` // Show the linked workflow details
      } else {
        // Fallback to dashboard if no workflow ID
        window.location.href = '/dashboard'
      }
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
          business_phone: formatPhoneNumber(formData.business_phone),
          twilio_number: formatPhoneNumber(formData.twilio_number),
          agency_id: formData.agency_id || undefined,
          force_create: true // Skip checking for existing workflows
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create workflow')
      }

      // Redirect to the workflow detail page to see the new workflow
      if (result.workflow?.id) {
        window.location.href = `/workflow/${result.workflow.id}` // Show the new workflow details
      } else {
        // Fallback to dashboard if no workflow ID
        window.location.href = '/dashboard'
      }
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const formatted = formatPhoneNumber(value)
    if (formatted !== value) {
      setFormData(prev => ({ ...prev, [name]: formatted }))
    }
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
            <label htmlFor="agency_id" className="label">
              Marketing Agency *
            </label>
            <div className="flex gap-2">
              <select
                id="agency_id"
                name="agency_id"
                value={formData.agency_id}
                onChange={handleSelectChange}
                required
                className="input flex-1"
                disabled={loadingAgencies}
              >
                <option value="">Select an agency...</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAgencyModal(true)}
                className="btn btn-secondary whitespace-nowrap"
                disabled={loadingAgencies}
              >
                Add New Agency
              </button>
            </div>
          </div>

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
              onBlur={handlePhoneBlur}
              required
              className="input"
              placeholder="e.g., (256) 406-4689 or +12564064689"
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
              onBlur={handlePhoneBlur}
              required
              className="input"
              placeholder="e.g., (256) 406-4689 or +12564064689"
            />
          </div>

          <div>
            <label htmlFor="website" className="label">
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., https://www.business.com"
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

      <AgencyModal
        isOpen={showAgencyModal}
        onClose={() => setShowAgencyModal(false)}
        onAgencyCreated={handleAgencyCreated}
      />
    </div>
  )
}