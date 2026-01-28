'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import CommentSidebar from '@/components/CommentSidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Format currency
function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
    CLOSED: 'bg-red-100 text-red-800 border-red-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    DENIED: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

// Detail row component
function DetailRow({ label, value, isLink, href }) {
  return (
    <div className="flex py-2 border-b border-gray-100 last:border-0">
      <div className="w-48 text-sm font-medium text-gray-500">{label}</div>
      <div className="flex-1 text-gray-900">
        {isLink && href ? (
          <Link href={href} className="text-[#006B7D] hover:underline">
            {value || '-'}
          </Link>
        ) : (
          value || '-'
        )}
      </div>
    </div>
  )
}

// Section component
function Section({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-6">{children}</div>}
    </div>
  )
}

export default function ClaimDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [claim, setClaim] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)

  // Fetch claim data
  const fetchClaim = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          clients:client_id(id, name),
          locations:location_id(id, location_name, company, street_address, city, state)
        `)
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (error) throw error
      setClaim(data)
      setEditData(data)
    } catch (error) {
      console.error('Error fetching claim:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [params.id, profile?.organization_id])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) {
      fetchClaim()
    }
  }, [user, profile, fetchClaim])

  // Handle edit
  const handleEdit = () => {
    setEditData({ ...claim })
    setIsEditing(true)
  }

  // Handle cancel edit
  const handleCancel = () => {
    setEditData({ ...claim })
    setIsEditing(false)
  }

  // Handle save
  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('claims')
        .update({
          claim_number: editData.claim_number,
          claimant: editData.claimant,
          coverage: editData.coverage,
          property_name: editData.property_name,
          status: editData.status,
          loss_date: editData.loss_date || null,
          report_date: editData.report_date || null,
          closed_date: editData.closed_date || null,
          policy_number: editData.policy_number,
          tpa_claim_number: editData.tpa_claim_number,
          loss_description: editData.loss_description,
          total_incurred: editData.total_incurred || 0,
          total_paid: editData.total_paid || 0,
          total_reserved: editData.total_reserved || 0,
          deductible: editData.deductible || null,
          sir: editData.sir || null,
          adjuster_name: editData.adjuster_name,
          adjuster_email: editData.adjuster_email,
          adjuster_phone: editData.adjuster_phone,
          attorney_name: editData.attorney_name,
          attorney_firm: editData.attorney_firm,
          claim_type: editData.claim_type,
          cause_of_loss: editData.cause_of_loss,
          notes: editData.notes,
          last_modified_by: user.id,
        })
        .eq('id', params.id)

      if (error) throw error

      setClaim({ ...claim, ...editData })
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving claim:', error)
      alert('Failed to save changes: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this claim? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('claims')
        .delete()
        .eq('id', params.id)

      if (error) throw error
      router.push('/claims')
    } catch (error) {
      console.error('Error deleting claim:', error)
      alert('Failed to delete claim: ' + error.message)
    }
  }

  // Handle input change
  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading claim...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  if (error || !claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-medium">
              {error || 'Claim not found'}
            </p>
            <button
              onClick={() => router.push('/claims')}
              className="mt-4 text-[#006B7D] hover:underline"
            >
              Back to Claims
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      {/* Comment Sidebar */}
      <CommentSidebar
        entityType="claim"
        entityId={params.id}
        organizationId={profile.organization_id}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/claims')}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Claim Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-semibold text-gray-900">{claim.claim_number}</h1>
                <StatusBadge status={claim.status} />
              </div>
              <p className="text-gray-600">{claim.claimant}</p>
              {claim.clients && (
                <Link
                  href={`/clients/${claim.clients.id}`}
                  className="text-sm text-[#006B7D] hover:underline mt-1 block"
                >
                  Client: {claim.clients.name}
                </Link>
              )}
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Claim Details Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            {/* Basic Information */}
            <Section title="Basic Information">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
                    <input
                      type="text"
                      value={editData.claim_number || ''}
                      onChange={(e) => handleChange('claim_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claimant</label>
                    <input
                      type="text"
                      value={editData.claimant || ''}
                      onChange={(e) => handleChange('claimant', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editData.status || 'OPEN'}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    >
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                      <option value="PENDING">Pending</option>
                      <option value="DENIED">Denied</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coverage</label>
                    <select
                      value={editData.coverage || ''}
                      onChange={(e) => handleChange('coverage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
                    <input
                      type="text"
                      value={editData.claim_type || ''}
                      onChange={(e) => handleChange('claim_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                      placeholder="e.g., Bodily Injury, Property Damage"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Claim Number" value={claim.claim_number} />
                  <DetailRow label="Claimant" value={claim.claimant} />
                  <DetailRow label="Status" value={claim.status} />
                  <DetailRow label="Coverage" value={claim.coverage} />
                  <DetailRow label="Claim Type" value={claim.claim_type} />
                </>
              )}
            </Section>

            {/* Location & Property */}
            <Section title="Location & Property">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                    <input
                      type="text"
                      value={editData.property_name || ''}
                      onChange={(e) => handleChange('property_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Property Name" value={claim.property_name} />
                  {claim.locations && (
                    <>
                      <DetailRow
                        label="Location"
                        value={claim.locations.location_name || claim.locations.company}
                        isLink
                        href={`/clients/${claim.client_id}/locations/${claim.location_id}`}
                      />
                      <DetailRow
                        label="Address"
                        value={[
                          claim.locations.street_address,
                          claim.locations.city,
                          claim.locations.state
                        ].filter(Boolean).join(', ')}
                      />
                    </>
                  )}
                </>
              )}
            </Section>

            {/* Policy Information */}
            <Section title="Policy Information">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                    <input
                      type="text"
                      value={editData.policy_number || ''}
                      onChange={(e) => handleChange('policy_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TPA Claim Number</label>
                    <input
                      type="text"
                      value={editData.tpa_claim_number || ''}
                      onChange={(e) => handleChange('tpa_claim_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Policy Number" value={claim.policy_number} />
                  <DetailRow label="TPA Claim Number" value={claim.tpa_claim_number} />
                </>
              )}
            </Section>
          </div>

          {/* Right Column */}
          <div>
            {/* Dates */}
            <Section title="Important Dates">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loss Date</label>
                    <input
                      type="date"
                      value={editData.loss_date || ''}
                      onChange={(e) => handleChange('loss_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                    <input
                      type="date"
                      value={editData.report_date || ''}
                      onChange={(e) => handleChange('report_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Closed Date</label>
                    <input
                      type="date"
                      value={editData.closed_date || ''}
                      onChange={(e) => handleChange('closed_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Loss Date" value={formatDate(claim.loss_date)} />
                  <DetailRow label="Report Date" value={formatDate(claim.report_date)} />
                  <DetailRow label="Closed Date" value={formatDate(claim.closed_date)} />
                </>
              )}
            </Section>

            {/* Financial Information */}
            <Section title="Financial Information">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Incurred</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.total_incurred || ''}
                      onChange={(e) => handleChange('total_incurred', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Paid</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.total_paid || ''}
                      onChange={(e) => handleChange('total_paid', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Reserved</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.total_reserved || ''}
                      onChange={(e) => handleChange('total_reserved', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deductible</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.deductible || ''}
                      onChange={(e) => handleChange('deductible', parseFloat(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.sir || ''}
                      onChange={(e) => handleChange('sir', parseFloat(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Total Incurred" value={formatCurrency(claim.total_incurred)} />
                  <DetailRow label="Total Paid" value={formatCurrency(claim.total_paid)} />
                  <DetailRow label="Total Reserved" value={formatCurrency(claim.total_reserved)} />
                  <DetailRow label="Deductible" value={claim.deductible ? formatCurrency(claim.deductible) : '-'} />
                  <DetailRow label="SIR" value={claim.sir ? formatCurrency(claim.sir) : '-'} />
                </>
              )}
            </Section>

            {/* Adjuster Information */}
            <Section title="Adjuster Information" defaultOpen={false}>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjuster Name</label>
                    <input
                      type="text"
                      value={editData.adjuster_name || ''}
                      onChange={(e) => handleChange('adjuster_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjuster Email</label>
                    <input
                      type="email"
                      value={editData.adjuster_email || ''}
                      onChange={(e) => handleChange('adjuster_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adjuster Phone</label>
                    <input
                      type="tel"
                      value={editData.adjuster_phone || ''}
                      onChange={(e) => handleChange('adjuster_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Adjuster Name" value={claim.adjuster_name} />
                  <DetailRow label="Adjuster Email" value={claim.adjuster_email} />
                  <DetailRow label="Adjuster Phone" value={claim.adjuster_phone} />
                </>
              )}
            </Section>
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="mt-6">
          {/* Loss Description */}
          <Section title="Loss Description">
            {isEditing ? (
              <div>
                <textarea
                  value={editData.loss_description || ''}
                  onChange={(e) => handleChange('loss_description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Describe the loss..."
                />
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {claim.loss_description || 'No description provided.'}
              </p>
            )}
          </Section>

          {/* Cause of Loss */}
          <Section title="Cause of Loss" defaultOpen={false}>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editData.cause_of_loss || ''}
                  onChange={(e) => handleChange('cause_of_loss', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="e.g., Fire, Water Damage, Theft"
                />
              </div>
            ) : (
              <p className="text-gray-700">{claim.cause_of_loss || 'Not specified.'}</p>
            )}
          </Section>

          {/* Notes */}
          <Section title="Notes" defaultOpen={false}>
            {isEditing ? (
              <div>
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  placeholder="Additional notes..."
                />
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {claim.notes || 'No notes.'}
              </p>
            )}
          </Section>
        </div>
      </main>
    </div>
  )
}
