'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function EditPolicyPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [policy, setPolicy] = useState(null)
  const [locations, setLocations] = useState([])
  const [policyLocations, setPolicyLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    policy_number: '',
    policy_type: '',
    carrier: '',
    carrier_policy_number: '',
    effective_date: '',
    expiration_date: '',
    premium: '',
    deductible: '',
    per_occurrence_limit: '',
    aggregate_limit: '',
    total_insured_value: '',
    status: 'active',
    notes: '',
  })

  // Policy type options
  const policyTypes = [
    'General Liability',
    'Property',
    'Umbrella/Excess',
    'Workers Compensation',
    'Commercial Auto',
    'Professional Liability',
    'Directors & Officers',
    'Cyber Liability',
    'Other',
  ]

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'pending', label: 'Pending' },
    { value: 'renewed', label: 'Renewed' },
  ]

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch policy data
  const fetchPolicy = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)

      // Fetch policy
      const { data: policyData, error: policyError } = await supabase
        .from('policies')
        .select('*, clients:client_id(id, name)')
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (policyError) throw policyError
      setPolicy(policyData)

      // Set form data
      setFormData({
        policy_number: policyData.policy_number || '',
        policy_type: policyData.policy_type || '',
        carrier: policyData.carrier || '',
        carrier_policy_number: policyData.carrier_policy_number || '',
        effective_date: policyData.effective_date || '',
        expiration_date: policyData.expiration_date || '',
        premium: policyData.premium || '',
        deductible: policyData.deductible || '',
        per_occurrence_limit: policyData.per_occurrence_limit || '',
        aggregate_limit: policyData.aggregate_limit || '',
        total_insured_value: policyData.total_insured_value || '',
        status: policyData.status || 'active',
        notes: policyData.notes || '',
      })

      // Fetch locations for this client
      if (policyData.client_id) {
        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, location_name, company, city, state, total_tiv')
          .eq('client_id', policyData.client_id)
          .eq('organization_id', profile.organization_id)
          .order('location_name')

        setLocations(locationsData || [])
      }

      // Fetch policy_locations
      const { data: policyLocationsData } = await supabase
        .from('policy_locations')
        .select('id, location_id, location_tiv, location_premium')
        .eq('policy_id', params.id)

      setPolicyLocations(policyLocationsData || [])
    } catch (error) {
      console.error('Error fetching policy:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, profile?.organization_id])

  useEffect(() => {
    if (user && profile) {
      fetchPolicy()
    }
  }, [user, profile, fetchPolicy])

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle location toggle
  const handleLocationToggle = (locationId) => {
    setPolicyLocations(prev => {
      const existing = prev.find(pl => pl.location_id === locationId)
      if (existing) {
        return prev.filter(pl => pl.location_id !== locationId)
      } else {
        const location = locations.find(l => l.id === locationId)
        return [...prev, {
          location_id: locationId,
          location_tiv: location?.total_tiv || 0,
          location_premium: 0,
        }]
      }
    })
  }

  // Handle select all / deselect all
  const handleSelectAll = () => {
    const allSelected = locations.length > 0 && policyLocations.length === locations.length
    if (allSelected) {
      // Deselect all
      setPolicyLocations([])
    } else {
      // Select all
      setPolicyLocations(locations.map(location => ({
        location_id: location.id,
        location_tiv: location.total_tiv || 0,
        location_premium: 0,
      })))
    }
  }

  // Check if all locations are selected
  const allLocationsSelected = locations.length > 0 && policyLocations.length === locations.length
  const someLocationsSelected = policyLocations.length > 0 && policyLocations.length < locations.length

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.policy_number.trim()) {
      alert('Policy number is required')
      return
    }

    setSaving(true)
    try {
      // Update policy
      const { error: policyError } = await supabase
        .from('policies')
        .update({
          policy_number: formData.policy_number.trim(),
          policy_type: formData.policy_type || null,
          carrier: formData.carrier.trim() || null,
          carrier_policy_number: formData.carrier_policy_number.trim() || null,
          effective_date: formData.effective_date || null,
          expiration_date: formData.expiration_date || null,
          premium: parseFloat(formData.premium) || null,
          deductible: parseFloat(formData.deductible) || null,
          per_occurrence_limit: parseFloat(formData.per_occurrence_limit) || null,
          aggregate_limit: parseFloat(formData.aggregate_limit) || null,
          total_insured_value: parseFloat(formData.total_insured_value) || null,
          status: formData.status,
          notes: formData.notes.trim() || null,
        })
        .eq('id', params.id)

      if (policyError) throw policyError

      // Update policy_locations
      // First, delete existing
      await supabase
        .from('policy_locations')
        .delete()
        .eq('policy_id', params.id)

      // Then insert new ones
      if (policyLocations.length > 0) {
        const { error: locationsError } = await supabase
          .from('policy_locations')
          .insert(
            policyLocations.map(pl => ({
              policy_id: params.id,
              location_id: pl.location_id,
              organization_id: profile.organization_id,
              location_tiv: pl.location_tiv || 0,
              location_premium: pl.location_premium || 0,
            }))
          )

        if (locationsError) throw locationsError
      }

      router.push(`/policies/${params.id}`)
    } catch (error) {
      console.error('Error saving policy:', error)
      alert('Failed to save policy: ' + error.message)
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

  if (!user || !policy) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/policies/${params.id}`)}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Policy
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Policy</h1>

            {/* Basic Info */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Information</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => handleChange('policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Type</label>
                <select
                  value={formData.policy_type}
                  onChange={(e) => handleChange('policy_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  <option value="">Select type</option>
                  {policyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                <input
                  type="text"
                  value={formData.carrier}
                  onChange={(e) => handleChange('carrier', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier Policy #</label>
                <input
                  type="text"
                  value={formData.carrier_policy_number}
                  onChange={(e) => handleChange('carrier_policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Period</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => handleChange('effective_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => handleChange('expiration_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Financial */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premium}
                    onChange={(e) => handleChange('premium', e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deductible</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deductible}
                    onChange={(e) => handleChange('deductible', e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per Occurrence Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.per_occurrence_limit}
                    onChange={(e) => handleChange('per_occurrence_limit', e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aggregate Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.aggregate_limit}
                    onChange={(e) => handleChange('aggregate_limit', e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Insured Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_insured_value}
                    onChange={(e) => handleChange('total_insured_value', e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                </div>
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

          {/* Covered Locations */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Covered Locations</h2>
                <p className="text-sm text-gray-500">Select the locations covered by this policy</p>
              </div>
              {locations.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-[#006B7D] hover:text-[#008BA3] font-medium"
                >
                  {allLocationsSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No locations available for this client
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {locations.map(location => {
                  const isSelected = policyLocations.some(pl => pl.location_id === location.id)
                  return (
                    <label
                      key={location.id}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-[#006B7D] bg-[#006B7D]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleLocationToggle(location.id)}
                          className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{location.location_name || location.company}</p>
                          <p className="text-sm text-gray-500">
                            {[location.city, location.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                      {location.total_tiv && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">TIV</p>
                          <p className="font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            }).format(location.total_tiv)}
                          </p>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            )}

            <p className="text-sm text-gray-500 mt-4">
              {policyLocations.length} location{policyLocations.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push(`/policies/${params.id}`)}
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
