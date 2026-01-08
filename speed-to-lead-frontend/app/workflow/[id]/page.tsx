'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  CheckCircleIcon,
  PauseIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { Workflow } from '@/lib/supabase'

interface WorkflowWithClient extends Workflow {
  clients: {
    id: string
    name: string
    business_name: string
    owner_name: string
    business_phone: string
    twilio_number: string
  }
}

export default function WorkflowDetailPage() {
  const params = useParams()
  const workflowId = params.id as string
  
  const [workflow, setWorkflow] = useState<WorkflowWithClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow()
    }
  }, [workflowId])

  const fetchWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workflow')
      }
      
      setWorkflow(data.workflow)
    } catch (error) {
      console.error('Error fetching workflow:', error)
      setError(error instanceof Error ? error.message : 'Failed to load workflow')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-success-500" />
      case 'paused':
        return <PauseIcon className="w-5 h-5 text-warning-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-400" />
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading workflow...</p>
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Workflow not found'}
        </h3>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center mb-8">
        <Link 
          href="/dashboard" 
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {workflow.clients.business_name}
          </h1>
          <p className="text-gray-600 mt-1">Speed to Lead Workflow Details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Basic Info */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Workflow Status</h2>
              <div className="flex items-center">
                {getStatusIcon(workflow.status)}
                <span className="ml-2 font-medium text-gray-700">
                  {getStatusText(workflow.status)}
                </span>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-900 mb-1">Workflow Name</p>
                <p className="text-gray-600">{workflow.workflow_name}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">n8n Workflow ID</p>
                <p className="font-mono text-gray-600">{workflow.n8n_workflow_id}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Created</p>
                <p className="text-gray-600">
                  {new Date(workflow.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Last Activity</p>
                <p className="text-gray-600">
                  {workflow.last_activity 
                    ? new Date(workflow.last_activity).toLocaleDateString()
                    : 'No activity yet'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Webhook URLs */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhook URLs</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">Lead Form Webhook</p>
                  <button
                    onClick={() => copyToClipboard(workflow.lead_form_webhook, 'lead_form')}
                    className="btn btn-secondary text-xs flex items-center"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                    {copySuccess === 'lead_form' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-mono text-sm text-gray-700 break-all">
                    {workflow.lead_form_webhook}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use this URL to receive lead form submissions
                </p>
              </div>

            </div>
          </div>

          {/* n8n Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Management</h2>
            <div className="flex space-x-4">
              <a
                href={workflow.n8n_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex items-center"
              >
                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                Edit in n8n
              </a>
              <button className="btn btn-secondary">
                View Logs
              </button>
              <button className="btn btn-secondary">
                {workflow.status === 'active' ? 'Pause' : 'Activate'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">Business Name</p>
                <p className="text-gray-600">{workflow.clients.business_name}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Owner</p>
                <p className="text-gray-600">{workflow.clients.owner_name}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Business Phone</p>
                <p className="text-gray-600">{workflow.clients.business_phone}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Twilio Number</p>
                <p className="text-gray-600">{workflow.clients.twilio_number}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Client ID</p>
                <p className="font-mono text-gray-600">{workflow.clients.id}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Leads</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Calls Connected</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connection Rate</span>
                <span className="font-semibold">-</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                Stats will appear once leads start coming through
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}