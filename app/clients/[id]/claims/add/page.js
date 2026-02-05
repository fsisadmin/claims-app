'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function AddClaimForClientPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const fromIncidentId = searchParams.get('from_incident')
  const { user, profile, loading: authLoading } = useAuth()

  const [client, setClient] = useState(null)
  const [locations, setLocations] = useState([])
  const [sourceIncident, setSourceIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    claim_number: '',
    claimant: '',
    location_id: '',
    coverage: '',
    property_name: '',
    status: 'OPEN',
    loss_date: '',
    report_date: new Date().toISOString().split('T')[0],
    policy_number: '',
    tpa_claim_number: '',
    loss_description: '',
    total_incurred: '',
    claim_type: '',
    cause_of_loss: '',
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch client and their locations
  const fetchData = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch locations for this client
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, location_name, company')
        .eq('client_id', params.id)
        .eq('organization_id', profile.organization_id)
        .order('location_name')

      if (locationsError) throw locationsError
      setLocations(locationsData || [])

      // If coming from an incident, fetch incident data and pre-populate form
      if (fromIncidentId) {
        const { data: incidentData, error: incidentError } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', fromIncidentId)
          .eq('organization_id', profile.organization_id)
          .single()

        if (!incidentError && incidentData) {
          setSourceIncident(incidentData)
          // Pre-populate form with incident data
          setFormData(prev => ({
            ...prev,
            claimant: incidentData.claimant || incidentData.reported_by || '',
            location_id: incidentData.location_id || '',
            property_name: incidentData.property_name || '',
            loss_date: incidentData.loss_date || '',
            report_date: incidentData.report_date || new Date().toISOString().split('T')[0],
            policy_number: incidentData.policy || '',
            loss_description: incidentData.event_description || incidentData.accident_description || '',
            claim_type: incidentData.incident_type || '',
            cause_of_loss: incidentData.cause_of_loss || '',
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id, params.id, fromIncidentId])

  useEffect(() => {
    if (user && profile) {
      fetchData()
    }
  }, [user, profile, fetchData])

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.claim_number.trim()) {
      alert('Claim number is required')
      return
    }

    setSaving(true)
    try {
      const insertData = {
        organization_id: profile.organization_id,
        client_id: params.id, // Pre-set to this client
        claim_number: formData.claim_number.trim(),
        claimant: formData.claimant.trim() || null,
        location_id: formData.location_id || null,
        coverage: formData.coverage || null,
        property_name: formData.property_name.trim() || null,
        status: formData.status,
        loss_date: formData.loss_date || null,
        report_date: formData.report_date || null,
        policy_number: formData.policy_number.trim() || null,
        tpa_claim_number: formData.tpa_claim_number.trim() || null,
        loss_description: formData.loss_description.trim() || null,
        total_incurred: parseFloat(formData.total_incurred) || 0,
        claim_type: formData.claim_type.trim() || null,
        cause_of_loss: formData.cause_of_loss.trim() || null,
        created_by: user.id,
      }

      // Link to source incident if creating from one
      if (fromIncidentId) {
        insertData.incident_id = fromIncidentId
      }

      const { data, error } = await supabase
        .from('claims')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      // Go back to client page with claims tab
      router.push(`/clients/${params.id}?tab=claims`)
    } catch (error) {
      console.error('Error creating claim:', error)
      alert('Failed to create claim: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user || !client) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/clients/${params.id}`)}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {client.name}
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">New Claim</h1>
            <p className="text-gray-600 mt-1">for {client.name}</p>
            {sourceIncident && (
              <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Creating from Incident #{sourceIncident.incident_number} - Form has been pre-populated with incident data
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claim Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.claim_number}
                  onChange={(e) => handleChange('claim_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., CLM-2025-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claimant</label>
                <input
                  type="text"
                  value={formData.claimant}
                  onChange={(e) => handleChange('claimant', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Name of claimant"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={formData.location_id}
                onChange={(e) => handleChange('location_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
              >
                <option value="">Select location (optional)</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name || loc.company}
                  </option>
                ))}
              </select>
              {locations.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No locations found for this client</p>
              )}
            </div>

            {/* Coverage and Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coverage</label>
                <select
                  value={formData.coverage}
                  onChange={(e) => handleChange('coverage', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  <option value="">Select coverage</option>
                  <option value="General Liability">General Liability</option>
                  <option value="Property">Property</option>
                  <option value="Auto">Auto</option>
                  <option value="Workers Comp">Workers Comp</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="PENDING">Pending</option>
                  <option value="DENIED">Denied</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
                <input
                  type="text"
                  value={formData.claim_type}
                  onChange={(e) => handleChange('claim_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., Bodily Injury"
                />
              </div>
            </div>

            {/* Property Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
              <input
                type="text"
                value={formData.property_name}
                onChange={(e) => handleChange('property_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                placeholder="Name of property"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Date</label>
                <input
                  type="date"
                  value={formData.loss_date}
                  onChange={(e) => handleChange('loss_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                <input
                  type="date"
                  value={formData.report_date}
                  onChange={(e) => handleChange('report_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Policy Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => handleChange('policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Policy number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TPA Claim Number</label>
                <input
                  type="text"
                  value={formData.tpa_claim_number}
                  onChange={(e) => handleChange('tpa_claim_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="TPA claim number"
                />
              </div>
            </div>

            {/* Financial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Incurred ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_incurred}
                  onChange={(e) => handleChange('total_incurred', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cause of Loss</label>
                <input
                  type="text"
                  value={formData.cause_of_loss}
                  onChange={(e) => handleChange('cause_of_loss', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., Fire, Water Damage"
                />
              </div>
            </div>

            {/* Loss Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loss Description</label>
              <textarea
                value={formData.loss_description}
                onChange={(e) => handleChange('loss_description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                placeholder="Describe the loss incident..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/clients/${params.id}`)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Claim'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
