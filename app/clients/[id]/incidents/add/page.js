'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function AddIncidentForClientPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [client, setClient] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    incident_details: '',
    incident_type: '',
    location_id: '',
    loss_date: '',
    event_description: '',
    property_name: '',
    incident_only: false,
    status: 'OPEN',
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
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id, params.id])

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

    if (!formData.incident_details.trim()) {
      alert('Incident details are required')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          organization_id: profile.organization_id,
          client_id: params.id,
          incident_details: formData.incident_details.trim(),
          incident_type: formData.incident_type.trim() || null,
          location_id: formData.location_id || null,
          loss_date: formData.loss_date || null,
          event_description: formData.event_description.trim() || null,
          property_name: formData.property_name.trim() || null,
          incident_only: formData.incident_only,
          status: formData.status,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Go back to client page with incidents tab
      router.push(`/clients/${params.id}?tab=incidents`)
    } catch (error) {
      console.error('Error creating incident:', error)
      alert('Failed to create incident: ' + error.message)
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
            onClick={() => router.push(`/clients/${params.id}?tab=incidents`)}
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
            <h1 className="text-2xl font-semibold text-gray-900">New Incident</h1>
            <p className="text-gray-600 mt-1">for {client.name}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Incident Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incident Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.incident_details}
                onChange={(e) => handleChange('incident_details', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                placeholder="Describe the incident..."
                required
              />
            </div>

            {/* Incident Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                <input
                  type="text"
                  value={formData.incident_type}
                  onChange={(e) => handleChange('incident_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., Slip and Fall, Vehicle Accident"
                />
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
                  <option value="UNDER_REVIEW">Under Review</option>
                </select>
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

            {/* Loss Date and Property Name */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                <input
                  type="text"
                  value={formData.property_name}
                  onChange={(e) => handleChange('property_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Name of property"
                />
              </div>
            </div>

            {/* Event Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
              <textarea
                value={formData.event_description}
                onChange={(e) => handleChange('event_description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                placeholder="Describe the event in detail..."
              />
            </div>

            {/* Incident Only Checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="incident_only"
                checked={formData.incident_only}
                onChange={(e) => handleChange('incident_only', e.target.checked)}
                className="w-5 h-5 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
              />
              <label htmlFor="incident_only" className="text-sm font-medium text-gray-700">
                Incident Only (not a claim)
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/clients/${params.id}?tab=incidents`)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Incident'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
