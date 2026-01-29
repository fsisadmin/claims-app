'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function EditClaimPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [claim, setClaim] = useState(null)
  const [locations, setLocations] = useState([])
  const [financials, setFinancials] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    claim_number: '',
    claimant: '',
    coverage: '',
    loss_date: '',
    report_date: '',
    closed_date: '',
    location_id: '',
    property_name: '',
    loss_description: '',
    status: 'OPEN',
    manually_entered_claim: false,
    loss_summary_claim: false,
    policy_number: '',
    policy_name: '',
    policy_named_insured: '',
    carrier: '',
    wholesaler: '',
    carrier_policy_number: '',
    carrier_policy_effective_date: '',
    cause_of_loss: '',
    tpa_claim_number: '',
    claim_type: '',
    adjuster_name: '',
    adjuster_email: '',
    adjuster_phone: '',
    attorney_name: '',
    attorney_firm: '',
    notes: '',
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch claim data
  const fetchClaim = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)

      // Fetch claim
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select('*, clients:client_id(id, name)')
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (claimError) throw claimError
      setClaim(claimData)

      // Set form data
      setFormData({
        claim_number: claimData.claim_number || '',
        claimant: claimData.claimant || '',
        coverage: claimData.coverage || '',
        loss_date: claimData.loss_date || '',
        report_date: claimData.report_date || '',
        closed_date: claimData.closed_date || '',
        location_id: claimData.location_id || '',
        property_name: claimData.property_name || '',
        loss_description: claimData.loss_description || '',
        status: claimData.status || 'OPEN',
        manually_entered_claim: claimData.manually_entered_claim || false,
        loss_summary_claim: claimData.loss_summary_claim || false,
        policy_number: claimData.policy_number || '',
        policy_name: claimData.policy_name || '',
        policy_named_insured: claimData.policy_named_insured || '',
        carrier: claimData.carrier || '',
        wholesaler: claimData.wholesaler || '',
        carrier_policy_number: claimData.carrier_policy_number || '',
        carrier_policy_effective_date: claimData.carrier_policy_effective_date || '',
        cause_of_loss: claimData.cause_of_loss || '',
        tpa_claim_number: claimData.tpa_claim_number || '',
        claim_type: claimData.claim_type || '',
        adjuster_name: claimData.adjuster_name || '',
        adjuster_email: claimData.adjuster_email || '',
        adjuster_phone: claimData.adjuster_phone || '',
        attorney_name: claimData.attorney_name || '',
        attorney_firm: claimData.attorney_firm || '',
        notes: claimData.notes || '',
      })

      // Fetch locations for this client
      if (claimData.client_id) {
        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, location_name, company')
          .eq('client_id', claimData.client_id)
          .eq('organization_id', profile.organization_id)
          .order('location_name')

        setLocations(locationsData || [])
      }

      // Fetch financials
      const { data: financialsData } = await supabase
        .from('claim_financials')
        .select('*')
        .eq('claim_id', params.id)
        .order('category')

      setFinancials(financialsData || [])
    } catch (error) {
      console.error('Error fetching claim:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, profile?.organization_id])

  useEffect(() => {
    if (user && profile) {
      fetchClaim()
    }
  }, [user, profile, fetchClaim])

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle financial change
  const handleFinancialChange = (category, field, value) => {
    setFinancials(prev => prev.map(f =>
      f.category === category ? { ...f, [field]: parseFloat(value) || 0 } : f
    ))
  }

  // Get financial by category
  const getFinancialByCategory = (category) => {
    return financials.find(f => f.category === category) || { reserves: 0, paid: 0, outstanding: 0, incurred: 0 }
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
      // Update claim
      const { error: claimError } = await supabase
        .from('claims')
        .update({
          claim_number: formData.claim_number.trim(),
          claimant: formData.claimant.trim() || null,
          coverage: formData.coverage || null,
          loss_date: formData.loss_date || null,
          report_date: formData.report_date || null,
          closed_date: formData.closed_date || null,
          location_id: formData.location_id || null,
          property_name: formData.property_name.trim() || null,
          loss_description: formData.loss_description.trim() || null,
          status: formData.status,
          manually_entered_claim: formData.manually_entered_claim,
          loss_summary_claim: formData.loss_summary_claim,
          policy_number: formData.policy_number.trim() || null,
          policy_name: formData.policy_name.trim() || null,
          policy_named_insured: formData.policy_named_insured.trim() || null,
          carrier: formData.carrier.trim() || null,
          wholesaler: formData.wholesaler.trim() || null,
          carrier_policy_number: formData.carrier_policy_number.trim() || null,
          carrier_policy_effective_date: formData.carrier_policy_effective_date || null,
          cause_of_loss: formData.cause_of_loss.trim() || null,
          tpa_claim_number: formData.tpa_claim_number.trim() || null,
          claim_type: formData.claim_type.trim() || null,
          adjuster_name: formData.adjuster_name.trim() || null,
          adjuster_email: formData.adjuster_email.trim() || null,
          adjuster_phone: formData.adjuster_phone.trim() || null,
          attorney_name: formData.attorney_name.trim() || null,
          attorney_firm: formData.attorney_firm.trim() || null,
          notes: formData.notes.trim() || null,
          last_modified_by: user.id,
        })
        .eq('id', params.id)

      if (claimError) throw claimError

      // Update financials
      for (const financial of financials) {
        const { error: financialError } = await supabase
          .from('claim_financials')
          .upsert({
            id: financial.id,
            claim_id: params.id,
            organization_id: profile.organization_id,
            category: financial.category,
            reserves: financial.reserves || 0,
            paid: financial.paid || 0,
            outstanding: financial.outstanding || 0,
            incurred: financial.incurred || 0,
          })

        if (financialError) {
          console.error('Error updating financial:', financialError)
        }
      }

      router.push(`/claims/${params.id}`)
    } catch (error) {
      console.error('Error saving claim:', error)
      alert('Failed to save claim: ' + error.message)
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

  if (!user || !claim) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/claims/${params.id}`)}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Claim
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Claim</h1>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claim Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.claim_number}
                  onChange={(e) => handleChange('claim_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
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
                />
              </div>
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
            </div>

            {/* Dates */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dates</h3>
            <div className="grid grid-cols-3 gap-6 mb-8">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closed Date</label>
                <input
                  type="date"
                  value={formData.closed_date}
                  onChange={(e) => handleChange('closed_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Location & Property */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location & Property</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                <input
                  type="text"
                  value={formData.property_name}
                  onChange={(e) => handleChange('property_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6 mb-8">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.manually_entered_claim}
                  onChange={(e) => handleChange('manually_entered_claim', e.target.checked)}
                  className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
                />
                <span className="text-sm text-gray-700">Manually Entered Claim</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.loss_summary_claim}
                  onChange={(e) => handleChange('loss_summary_claim', e.target.checked)}
                  className="w-4 h-4 text-[#006B7D] border-gray-300 rounded focus:ring-[#006B7D]"
                />
                <span className="text-sm text-gray-700">Loss Summary Claim</span>
              </label>
            </div>

            {/* Policy Info */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Information</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => handleChange('policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name</label>
                <input
                  type="text"
                  value={formData.policy_name}
                  onChange={(e) => handleChange('policy_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Named Insured</label>
                <input
                  type="text"
                  value={formData.policy_named_insured}
                  onChange={(e) => handleChange('policy_named_insured', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Wholesaler</label>
                <input
                  type="text"
                  value={formData.wholesaler}
                  onChange={(e) => handleChange('wholesaler', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier Policy Number</label>
                <input
                  type="text"
                  value={formData.carrier_policy_number}
                  onChange={(e) => handleChange('carrier_policy_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier Policy Effective Date</label>
                <input
                  type="date"
                  value={formData.carrier_policy_effective_date}
                  onChange={(e) => handleChange('carrier_policy_effective_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TPA Claim Number</label>
                <input
                  type="text"
                  value={formData.tpa_claim_number}
                  onChange={(e) => handleChange('tpa_claim_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Loss Info */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Information</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cause of Loss</label>
                <input
                  type="text"
                  value={formData.cause_of_loss}
                  onChange={(e) => handleChange('cause_of_loss', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., Assault and Battery"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Description</label>
                <textarea
                  value={formData.loss_description}
                  onChange={(e) => handleChange('loss_description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Adjuster Info */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adjuster Information</h3>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjuster Name</label>
                <input
                  type="text"
                  value={formData.adjuster_name}
                  onChange={(e) => handleChange('adjuster_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjuster Email</label>
                <input
                  type="email"
                  value={formData.adjuster_email}
                  onChange={(e) => handleChange('adjuster_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjuster Phone</label>
                <input
                  type="tel"
                  value={formData.adjuster_phone}
                  onChange={(e) => handleChange('adjuster_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
            </div>

            {/* Attorney Info */}
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attorney Information</h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Name</label>
                <input
                  type="text"
                  value={formData.attorney_name}
                  onChange={(e) => handleChange('attorney_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Firm</label>
                <input
                  type="text"
                  value={formData.attorney_firm}
                  onChange={(e) => handleChange('attorney_firm', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
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

          {/* Financials Section */}
          {financials.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Information</h2>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-sm font-medium text-gray-600">Category</th>
                    <th className="py-2 text-right text-sm font-medium text-gray-600">Reserves</th>
                    <th className="py-2 text-right text-sm font-medium text-gray-600">Paid</th>
                    <th className="py-2 text-right text-sm font-medium text-gray-600">Outstanding</th>
                    <th className="py-2 text-right text-sm font-medium text-gray-600">Incurred</th>
                  </tr>
                </thead>
                <tbody>
                  {['Bodily Injury', 'Expense', 'Property Damage', 'Legal', 'Other', 'Recovery', 'Subrogation'].map(category => {
                    const data = getFinancialByCategory(category)
                    return (
                      <tr key={category} className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-700">{category}</td>
                        <td className="py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={data.reserves || 0}
                            onChange={(e) => handleFinancialChange(category, 'reserves', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm text-gray-900"
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={data.paid || 0}
                            onChange={(e) => handleFinancialChange(category, 'paid', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm text-gray-900"
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={data.outstanding || 0}
                            onChange={(e) => handleFinancialChange(category, 'outstanding', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm text-gray-900"
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={data.incurred || 0}
                            onChange={(e) => handleFinancialChange(category, 'incurred', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm text-gray-900"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push(`/claims/${params.id}`)}
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
