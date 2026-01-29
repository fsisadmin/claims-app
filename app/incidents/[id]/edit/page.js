'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function EditIncidentPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [incident, setIncident] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    claimant: '',
    incident_type: '',
    incident_details: '',
    property_name: '',
    loss_street_1: '',
    loss_street_2: '',
    loss_city: '',
    loss_state: '',
    loss_postal_code: '',
    policy: '',
    location_id: '',
    cause_of_loss: '',
    loss_date: '',
    report_date: '',
    accident_description: '',
    accident_state: '',
    event_description: '',
    status: 'OPEN',
    incident_only: false,
    reported_by: '',
    reported_by_email: '',
    reported_by_phone: '',
    injuries_reported: false,
    police_report_filed: false,
    police_report_number: '',
    notes: '',
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch incident data
  const fetchIncident = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)

      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select('*, clients:client_id(id, name)')
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (incidentError) throw incidentError
      setIncident(incidentData)

      // Set form data
      setFormData({
        claimant: incidentData.claimant || '',
        incident_type: incidentData.incident_type || '',
        incident_details: incidentData.incident_details || '',
        property_name: incidentData.property_name || '',
        loss_street_1: incidentData.loss_street_1 || '',
        loss_street_2: incidentData.loss_street_2 || '',
        loss_city: incidentData.loss_city || '',
        loss_state: incidentData.loss_state || '',
        loss_postal_code: incidentData.loss_postal_code || '',
        policy: incidentData.policy || '',
        location_id: incidentData.location_id || '',
        cause_of_loss: incidentData.cause_of_loss || '',
        loss_date: incidentData.loss_date || '',
        report_date: incidentData.report_date || '',
        accident_description: incidentData.accident_description || '',
        accident_state: incidentData.accident_state || '',
        event_description: incidentData.event_description || '',
        status: incidentData.status || 'OPEN',
        incident_only: incidentData.incident_only || false,
        reported_by: incidentData.reported_by || '',
        reported_by_email: incidentData.reported_by_email || '',
        reported_by_phone: incidentData.reported_by_phone || '',
        injuries_reported: incidentData.injuries_reported || false,
        police_report_filed: incidentData.police_report_filed || false,
        police_report_number: incidentData.police_report_number || '',
        notes: incidentData.notes || '',
      })

      // Fetch locations for this client
      if (incidentData.client_id) {
        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, location_name, company')
          .eq('client_id', incidentData.client_id)
          .eq('organization_id', profile.organization_id)
          .order('location_name')

        setLocations(locationsData || [])
      }
    } catch (error) {
      console.error('Error fetching incident:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, profile?.organization_id])

  useEffect(() => {
    if (user && profile) {
      fetchIncident()
    }
  }, [user, profile, fetchIncident])

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    setSaving(true)
    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          claimant: formData.claimant.trim() || null,
          incident_type: formData.incident_type.trim() || null,
          incident_details: formData.incident_details.trim() || null,
          property_name: formData.property_name.trim() || null,
          loss_street_1: formData.loss_street_1.trim() || null,
          loss_street_2: formData.loss_street_2.trim() || null,
          loss_city: formData.loss_city.trim() || null,
          loss_state: formData.loss_state.trim() || null,
          loss_postal_code: formData.loss_postal_code.trim() || null,
          policy: formData.policy.trim() || null,
          location_id: formData.location_id || null,
          cause_of_loss: formData.cause_of_loss.trim() || null,
          loss_date: formData.loss_date || null,
          report_date: formData.report_date || null,
          accident_description: formData.accident_description.trim() || null,
          accident_state: formData.accident_state.trim() || null,
          event_description: formData.event_description.trim() || null,
          status: formData.status,
          incident_only: formData.incident_only,
          reported_by: formData.reported_by.trim() || null,
          reported_by_email: formData.reported_by_email.trim() || null,
          reported_by_phone: formData.reported_by_phone.trim() || null,
          injuries_reported: formData.injuries_reported,
          police_report_filed: formData.police_report_filed,
          police_report_number: formData.police_report_number.trim() || null,
          notes: formData.notes.trim() || null,
          last_modified_by: user.id,
        })
        .eq('id', params.id)

      if (error) throw error

      router.push(`/incidents/${params.id}`)
    } catch (error) {
      console.error('Error saving incident:', error)
      alert('Failed to save incident: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  if (!user || !incident) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/incidents/${params.id}`)}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Incident
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Incident</h1>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claimant</label>
                <input
                  type="text"
                  value={formData.claimant}
                  onChange={(e) => handleChange('claimant', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., John Doe or Unknown Person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                <input
                  type="text"
                  value={formData.incident_type}
                  onChange={(e) => handleChange('incident_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., GL/Bodily Injury/Third Party Property Damage"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy</label>
                <input
                  type="text"
                  value={formData.policy}
                  onChange={(e) => handleChange('policy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., CSU0258980 - GL Cinci (tower 2)"
                />
              </div>
            </div>

            {/* Loss Location */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Location</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                <input
                  type="text"
                  value={formData.property_name}
                  onChange={(e) => handleChange('property_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => handleChange('location_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  <option value="">Select location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name || loc.company}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Street 1</label>
                <input
                  type="text"
                  value={formData.loss_street_1}
                  onChange={(e) => handleChange('loss_street_1', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Street 2</label>
                <input
                  type="text"
                  value={formData.loss_street_2}
                  onChange={(e) => handleChange('loss_street_2', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss City</label>
                <input
                  type="text"
                  value={formData.loss_city}
                  onChange={(e) => handleChange('loss_city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss State</label>
                <input
                  type="text"
                  value={formData.loss_state}
                  onChange={(e) => handleChange('loss_state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Postal Code</label>
                <input
                  type="text"
                  value={formData.loss_postal_code}
                  onChange={(e) => handleChange('loss_postal_code', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accident State</label>
                <input
                  type="text"
                  value={formData.accident_state}
                  onChange={(e) => handleChange('accident_state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Dates */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dates</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
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

            {/* Description */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cause of Loss</label>
                <input
                  type="text"
                  value={formData.cause_of_loss}
                  onChange={(e) => handleChange('cause_of_loss', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., Shooting, Slip and Fall"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Details</label>
                <textarea
                  value={formData.incident_details}
                  onChange={(e) => handleChange('incident_details', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Brief description for list view"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accident Description</label>
                <textarea
                  value={formData.accident_description}
                  onChange={(e) => handleChange('accident_description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Full accident description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Description / Event Description</label>
                <textarea
                  value={formData.event_description}
                  onChange={(e) => handleChange('event_description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Reported By */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reported By</h3>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.reported_by}
                  onChange={(e) => handleChange('reported_by', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.reported_by_email}
                  onChange={(e) => handleChange('reported_by_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.reported_by_phone}
                  onChange={(e) => handleChange('reported_by_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.incident_only}
                    onChange={(e) => handleChange('incident_only', e.target.checked)}
                    className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
                  />
                  <span className="text-sm text-gray-700">Incident Only (not a claim)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.injuries_reported}
                    onChange={(e) => handleChange('injuries_reported', e.target.checked)}
                    className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
                  />
                  <span className="text-sm text-gray-700">Injuries Reported</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.police_report_filed}
                    onChange={(e) => handleChange('police_report_filed', e.target.checked)}
                    className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
                  />
                  <span className="text-sm text-gray-700">Police Report Filed</span>
                </label>
              </div>
              <div>
                {formData.police_report_filed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Police Report Number</label>
                    <input
                      type="text"
                      value={formData.police_report_number}
                      onChange={(e) => handleChange('police_report_number', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push(`/incidents/${params.id}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
