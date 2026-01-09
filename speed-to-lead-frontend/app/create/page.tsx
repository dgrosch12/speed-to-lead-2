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
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-transparent bg-gradient-to-r from-gray-100 via-primary-300 to-gray-100 bg-clip-text mb-4">
          Create New Workflow
        </h1>
        <p className="text-gray-400 text-lg">
          Enter your client's information to generate a complete Speed to Lead automation workflow.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {existingWorkflow && (
        <div className="mb-6 p-6 bg-primary-500/10 border border-primary-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary-300 mb-2">
                Workflow Found in n8n
              </h3>
              <p className="text-gray-300 mb-3">
                A workflow named <strong className="text-primary-300">"{existingWorkflow.name}"</strong> already exists in n8n.
              </p>
            </div>
          </div>
          <div className="mb-4 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Workflow ID</span>
                <span className="text-gray-300 font-mono">{existingWorkflow.id}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Status</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                  existingWorkflow.active ? 'bg-success-500/10 text-success-400 border border-success-500/30' : 'bg-accent-500/10 text-accent-400 border border-accent-500/30'
                }`}>
                  {existingWorkflow.active ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-300 mb-5">
            Would you like to link this existing workflow to the client instead of creating a new one?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleLinkExisting}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Linking...' : 'Yes, Link Existing Workflow'}
            </button>
            <button
              onClick={handleCreateNew}
              disabled={loading}
              className="btn btn-secondary flex-1"
            >
              No, Create New Workflow
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label htmlFor="agency_id" className="label flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Marketing Agency *
            </label>
            <div className="flex gap-3">
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
            <label htmlFor="business_name" className="label flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
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
            <label htmlFor="owner_name" className="label flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
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

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="business_phone" className="label flex items-center">
                <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
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
                placeholder="+1 (256) 406-4689"
              />
            </div>

            <div>
              <label htmlFor="twilio_number" className="label flex items-center">
                <svg className="w-4 h-4 mr-2 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
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
                placeholder="+1 (256) 406-4689"
              />
            </div>
          </div>

          <div>
            <label htmlFor="website" className="label flex items-center">
              <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Website <span className="text-gray-500 text-xs ml-1">(Optional)</span>
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="input"
              placeholder="https://www.business.com"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-8 border-t border-dark-700">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-secondary px-8"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center px-8"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Create Workflow
                </>
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