'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import CommentSidebar from '@/components/CommentSidebar'
import TasksSection from '@/components/TasksSection'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Format currency
function formatCurrency(value) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

// Detail row component
function DetailRow({ label, value, isLink, href }) {
  return (
    <div className="flex py-1.5">
      <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <div className="flex-1 text-sm text-gray-900">
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

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-700',
    renewed: 'bg-blue-100 text-blue-700',
  }
  const displayStatus = status?.charAt(0).toUpperCase() + status?.slice(1)
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {displayStatus}
    </span>
  )
}

// Check if policy is expiring soon (within 30 days)
function isExpiringSoon(expirationDate) {
  if (!expirationDate) return false
  const expDate = new Date(expirationDate)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return expDate <= thirtyDaysFromNow && expDate >= now
}

// Check if policy is expired
function isExpired(expirationDate) {
  if (!expirationDate) return false
  return new Date(expirationDate) < new Date()
}

export default function PolicyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [policy, setPolicy] = useState(null)
  const [policyLocations, setPolicyLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [users, setUsers] = useState([])

  // Fetch policy data
  const fetchPolicy = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          clients:client_id(id, name),
          policy_locations(
            id,
            location_id,
            location_tiv,
            location_premium,
            location:locations(id, location_name, city, state, street_address, num_units, square_footage, total_tiv)
          )
        `)
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (error) throw error
      setPolicy(data)
      setPolicyLocations(data.policy_locations || [])
    } catch (error) {
      console.error('Error fetching policy:', error)
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
      fetchPolicy()
    }
  }, [user, profile, fetchPolicy])

  // Fetch users for task assignment dropdown
  useEffect(() => {
    async function fetchUsers() {
      if (!profile?.organization_id) return
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name')
      setUsers(data || [])
    }
    fetchUsers()
  }, [profile?.organization_id])

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this policy? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', params.id)

      if (error) throw error
      router.push(`/clients/${policy.client_id}?tab=policies`)
    } catch (error) {
      console.error('Error deleting policy:', error)
      alert('Failed to delete policy: ' + error.message)
    }
  }

  // Calculate total TIV across all locations
  const totalTIV = policyLocations.reduce((sum, pl) => sum + (parseFloat(pl.location_tiv) || 0), 0)
  const totalUnits = policyLocations.reduce((sum, pl) => sum + (pl.location?.num_units || 0), 0)
  const totalSqFt = policyLocations.reduce((sum, pl) => sum + (pl.location?.square_footage || 0), 0)

  if (authLoading || !profile || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading policy...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">
              {error || 'Policy not found'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 text-[#006B7D] hover:underline"
            >
              Back to Clients
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Comment Sidebar */}
      <CommentSidebar
        entityType="policy"
        entityId={params.id}
        organizationId={profile.organization_id}
        entityName={policy.policy_number ? `Policy ${policy.policy_number}` : 'Policy'}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button and Client Overview */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {policy.client_id && (
            <Link
              href={`/clients/${policy.client_id}?tab=policies`}
              className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
            >
              Client Overview
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                {policy.policy_number}
              </h1>
              <StatusBadge status={policy.status} />
              {isExpiringSoon(policy.expiration_date) && !isExpired(policy.expiration_date) && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  Expiring Soon
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {policy.policy_type} • {policy.carrier}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href={`/policies/${params.id}/edit`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-sm font-medium transition-colors"
            >
              Edit Policy
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-1"
              >
                More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false)
                        handleDelete()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Delete Policy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Left Column - Policy Details */}
          <div className="col-span-2 space-y-6">
            {/* Policy Information Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#006B7D] mb-4">Policy Information</h2>

              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <DetailRow label="Policy Number" value={policy.policy_number} />
                  <DetailRow label="Policy Type" value={policy.policy_type} />
                  <DetailRow label="Carrier" value={policy.carrier} />
                  <DetailRow label="Carrier Policy #" value={policy.carrier_policy_number} />
                  <DetailRow
                    label="Client"
                    value={policy.clients?.name}
                    isLink
                    href={`/clients/${policy.client_id}`}
                  />
                </div>
                <div>
                  <DetailRow label="Effective Date" value={formatDate(policy.effective_date)} />
                  <DetailRow
                    label="Expiration Date"
                    value={
                      <span className={isExpired(policy.expiration_date) ? 'text-red-600 font-medium' : isExpiringSoon(policy.expiration_date) ? 'text-amber-600 font-medium' : ''}>
                        {formatDate(policy.expiration_date)}
                      </span>
                    }
                  />
                  <DetailRow label="Status" value={policy.status?.charAt(0).toUpperCase() + policy.status?.slice(1)} />
                </div>
              </div>
            </div>

            {/* Financial Details Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#006B7D] mb-4">Financial Details</h2>

              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <DetailRow label="Premium" value={formatCurrency(policy.premium)} />
                  <DetailRow label="Deductible" value={formatCurrency(policy.deductible)} />
                  <DetailRow label="Total Insured Value" value={formatCurrency(policy.total_insured_value)} />
                </div>
                <div>
                  <DetailRow label="Per Occurrence Limit" value={formatCurrency(policy.per_occurrence_limit)} />
                  <DetailRow label="Aggregate Limit" value={formatCurrency(policy.aggregate_limit)} />
                </div>
              </div>
            </div>

            {/* Covered Locations Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#006B7D]">
                  Covered Locations ({policyLocations.length})
                </h2>
                {policy.policy_type === 'General Liability' ? (
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>Total Units: <strong className="text-gray-900">{totalUnits.toLocaleString()}</strong></span>
                    <span>Total Sq Ft: <strong className="text-gray-900">{totalSqFt.toLocaleString()}</strong></span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Total TIV: <strong className="text-gray-900">{formatCurrency(totalTIV)}</strong>
                  </div>
                )}
              </div>

              {policyLocations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No locations linked to this policy
                </div>
              ) : (
                <div className="space-y-3">
                  {policyLocations.map((pl) => (
                    <Link
                      key={pl.id}
                      href={`/clients/${policy.client_id}/locations/${pl.location?.id || pl.location_id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#006B7D]/30 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#006B7D]/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-[#006B7D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {pl.location?.location_name || 'Unknown Location'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {pl.location?.street_address && `${pl.location.street_address}, `}
                            {[pl.location?.city, pl.location?.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                      {policy.policy_type === 'General Liability' ? (
                        <div className="flex items-center gap-8 text-right">
                          {pl.location?.num_units && (
                            <div>
                              <p className="text-xs text-gray-500">Units</p>
                              <p className="font-medium text-gray-900">{pl.location.num_units.toLocaleString()}</p>
                            </div>
                          )}
                          {pl.location?.square_footage && (
                            <div>
                              <p className="text-xs text-gray-500">Sq Ft</p>
                              <p className="font-medium text-gray-900">{pl.location.square_footage.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">TIV</p>
                          <p className="font-medium text-gray-900">{formatCurrency(pl.location_tiv || pl.location?.total_tiv)}</p>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Card */}
            {policy.notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-[#006B7D] mb-4">Notes</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{policy.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Tasks */}
          <div className="col-span-1">
            <TasksSection
              entityType="policy"
              entityId={params.id}
              clientId={policy.client_id}
              organizationId={profile.organization_id}
              users={users}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
