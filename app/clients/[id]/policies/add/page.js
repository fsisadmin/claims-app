'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function AddPolicyForClientPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [client, setClient] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLocations, setSelectedLocations] = useState([])

  const [formData, setFormData] = useState({
    policy_number: '',
    policy_type: '',
    carrier: '',
    carrier_policy_number: '',
    effective_date: '',
    expiration_date: '',
    premium: '',
    deductible: '',
    total_insured_value: '',
    per_occurrence_limit: '',
    aggregate_limit: '',
    status: 'active',
    notes: '',
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
        .select('id, location_name, company, city, state, total_tiv')
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

  // Toggle location selection
  const toggleLocation = (locationId) => {
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
  }

  // Select all locations
  const selectAllLocations = () => {
    setSelectedLocations(locations.map(loc => loc.id))
  }

  // Clear location selection
  const clearLocationSelection = () => {
    setSelectedLocations([])
  }

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.policy_number.trim()) {
      alert('Policy number is required')
      return
    }

    setSaving(true)
    try {
      // Insert the policy
      const { data: policyData, error: policyError } = await supabase
        .from('policies')
        .insert({
          organization_id: profile.organization_id,
          client_id: params.id,
          policy_number: formData.policy_number.trim(),
          policy_type: formData.policy_type || null,
          carrier: formData.carrier.trim() || null,
          carrier_policy_number: formData.carrier_policy_number.trim() || null,
          effective_date: formData.effective_date || null,
          expiration_date: formData.expiration_date || null,
          premium: parseFloat(formData.premium) || null,
          deductible: parseFloat(formData.deductible) || null,
          total_insured_value: parseFloat(formData.total_insured_value) || null,
          per_occurrence_limit: parseFloat(formData.per_occurrence_limit) || null,
          aggregate_limit: parseFloat(formData.aggregate_limit) || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
          created_by: user.id,
          modified_by: user.id,
        })
        .select()
        .single()

      if (policyError) throw policyError

      // Link selected locations to the policy
      if (selectedLocations.length > 0) {
        const policyLocations = selectedLocations.map(locationId => {
          const loc = locations.find(l => l.id === locationId)
          return {
            policy_id: policyData.id,
            location_id: locationId,
            organization_id: profile.organization_id,
            location_tiv: loc?.total_tiv || null,
          }
        })

        const { error: linkError } = await supabase
          .from('policy_locations')
          .insert(policyLocations)

        if (linkError) {
          console.error('Error linking locations:', linkError)
        }
      }

      // Navigate back to client with policies tab active
      router.push(`/clients/${params.id}?tab=policies`)
    } catch (error) {
      console.error('Error creating policy:', error)
      alert('Error creating policy: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Format currency for display
  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
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

  if (!user) return null

  const policyTypes = [
    'Property',
    'General Liability',
    'Auto',
    'Workers Compensation',
    'Umbrella',
    'Professional Liability',
    'Directors & Officers',
    'Cyber',
    'Flood',
    'Earthquake',
    'Other',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Add Policy</h1>
          <p className="text-gray-600 mt-1">
            Adding policy for <span className="font-medium">{client?.name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Policy Details Card */}
          <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Policy Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Policy Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => handleChange('policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                  required
                />
              </div>

              {/* Policy Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Type
                </label>
                <select
                  value={formData.policy_type}
                  onChange={(e) => handleChange('policy_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                >
                  <option value="">Select type...</option>
                  {policyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Carrier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier / Insurer
                </label>
                <input
                  type="text"
                  value={formData.carrier}
                  onChange={(e) => handleChange('carrier', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                />
              </div>

              {/* Carrier Policy Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier Policy Number
                </label>
                <input
                  type="text"
                  value={formData.carrier_policy_number}
                  onChange={(e) => handleChange('carrier_policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                />
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => handleChange('effective_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                />
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => handleChange('expiration_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="renewed">Renewed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial Details Card */}
          <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Financial Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Premium */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Premium
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premium}
                    onChange={(e) => handleChange('premium', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                  />
                </div>
              </div>

              {/* Deductible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deductible
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deductible}
                    onChange={(e) => handleChange('deductible', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                  />
                </div>
              </div>

              {/* Total Insured Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Insured Value (TIV)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_insured_value}
                    onChange={(e) => handleChange('total_insured_value', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                  />
                </div>
              </div>

              {/* Per Occurrence Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Occurrence Limit
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.per_occurrence_limit}
                    onChange={(e) => handleChange('per_occurrence_limit', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                  />
                </div>
              </div>

              {/* Aggregate Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aggregate Limit
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.aggregate_limit}
                    onChange={(e) => handleChange('aggregate_limit', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Covered Locations Card */}
          <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Covered Locations</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllLocations}
                  className="text-sm text-[#006B7D] hover:text-[#008BA3] font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={clearLocationSelection}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {locations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No locations found for this client. Add locations first.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {locations.map((location) => (
                  <label
                    key={location.id}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedLocations.includes(location.id)
                        ? 'border-[#006B7D] bg-[#006B7D]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(location.id)}
                      onChange={() => toggleLocation(location.id)}
                      className="w-5 h-5 text-[#006B7D] rounded border-gray-300 focus:ring-[#006B7D]"
                    />
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-gray-900">{location.location_name}</p>
                      <p className="text-sm text-gray-500">
                        {location.company && `${location.company} · `}
                        {[location.city, location.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    {location.total_tiv && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">TIV</p>
                        <p className="font-medium text-gray-900">{formatCurrency(location.total_tiv)}</p>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}

            {selectedLocations.length > 0 && (
              <p className="mt-4 text-sm text-gray-600">
                {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Notes Card */}
          <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notes</h2>

            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
              placeholder="Add any notes about this policy..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
