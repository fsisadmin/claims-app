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
  if (value === null || value === undefined) return '0.00'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Format date
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

// Detail row component
function DetailRow({ label, value, isLink, href, isCheckbox, checked }) {
  return (
    <div className="flex py-1.5">
      <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <div className="flex-1 text-sm text-gray-900">
        {isCheckbox ? (
          <input
            type="checkbox"
            checked={checked || false}
            disabled
            className="w-4 h-4 text-[#006B7D] border-gray-300 rounded"
          />
        ) : isLink && href ? (
          <Link href={href} className="text-[#006B7D] hover:underline">
            {value || ''}
          </Link>
        ) : (
          value || ''
        )}
      </div>
    </div>
  )
}

// Financial row component
function FinancialRow({ category, data, isExpandable = true, isNegative = false }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-4 text-sm text-gray-700">
        <div className="flex items-center gap-1">
          {isExpandable && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#006B7D] hover:text-[#008BA3] font-medium"
            >
              {expanded ? '-' : '+'}
            </button>
          )}
          {!isExpandable && <span className="w-3">{isNegative ? '-' : ''}</span>}
          <span className={isNegative ? 'text-gray-500' : ''}>{category}</span>
        </div>
      </td>
      <td className="py-2 px-4 text-sm text-right text-gray-700">{formatCurrency(data?.reserves || 0)}</td>
      <td className="py-2 px-4 text-sm text-right text-gray-700">{formatCurrency(data?.paid || 0)}</td>
      <td className="py-2 px-4 text-sm text-right text-gray-700">{formatCurrency(data?.outstanding || 0)}</td>
      <td className="py-2 px-4 text-sm text-right text-gray-700">{formatCurrency(data?.incurred || 0)}</td>
    </tr>
  )
}

export default function ClaimDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [claim, setClaim] = useState(null)
  const [financials, setFinancials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Fetch claim data
  const fetchClaim = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      setLoading(true)
      // Optimized: Select only needed columns instead of SELECT *
      const { data, error } = await supabase
        .from('claims')
        .select(`
          id, claim_number, claimant, status, coverage, claim_type, cause_of_loss,
          loss_date, report_date, close_date, reopen_date,
          loss_description, property_name, policy_number,
          total_incurred, total_paid, total_reserved, total_outstanding,
          adjuster, tpa, examiner, defense_counsel, insurance_carrier,
          deductible, deductible_satisfied, suit_filed, subrogation_potential,
          client_id, location_id, organization_id, created_at, updated_at,
          clients:client_id(id, name),
          locations:location_id(id, location_name, company, street_address, city, state)
        `)
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (error) throw error
      setClaim(data)

      // Fetch financials - optimized columns
      const { data: financialsData, error: financialsError } = await supabase
        .from('claim_financials')
        .select('id, claim_id, category, reserves, paid, outstanding, incurred')
        .eq('claim_id', params.id)
        .order('category')

      if (!financialsError) {
        setFinancials(financialsData || [])
      }
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

  // Get financial data by category
  const getFinancialByCategory = (category) => {
    return financials.find(f => f.category === category) || { reserves: 0, paid: 0, outstanding: 0, incurred: 0 }
  }

  // Calculate totals
  const calculateTotals = () => {
    const positiveCategories = ['Bodily Injury', 'Expense', 'Property Damage', 'Legal', 'Other']
    const negativeCategories = ['Recovery', 'Subrogation']

    let totals = { reserves: 0, paid: 0, outstanding: 0, incurred: 0 }

    positiveCategories.forEach(cat => {
      const data = getFinancialByCategory(cat)
      totals.reserves += parseFloat(data.reserves) || 0
      totals.paid += parseFloat(data.paid) || 0
      totals.outstanding += parseFloat(data.outstanding) || 0
      totals.incurred += parseFloat(data.incurred) || 0
    })

    negativeCategories.forEach(cat => {
      const data = getFinancialByCategory(cat)
      totals.reserves -= parseFloat(data.reserves) || 0
      totals.paid -= parseFloat(data.paid) || 0
      totals.outstanding -= parseFloat(data.outstanding) || 0
      totals.incurred -= parseFloat(data.incurred) || 0
    })

    return totals
  }

  // Handle close claim
  const handleCloseClaim = async () => {
    if (!confirm('Are you sure you want to close this claim?')) return

    try {
      const { error } = await supabase
        .from('claims')
        .update({
          status: 'CLOSED',
          closed_date: new Date().toISOString().split('T')[0],
          last_modified_by: user.id,
        })
        .eq('id', params.id)

      if (error) throw error
      fetchClaim()
    } catch (error) {
      console.error('Error closing claim:', error)
      alert('Failed to close claim: ' + error.message)
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
      router.push('/')
    } catch (error) {
      console.error('Error deleting claim:', error)
      alert('Failed to delete claim: ' + error.message)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">
              {error || 'Claim not found'}
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

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Comment Sidebar */}
      <CommentSidebar
        entityType="claim"
        entityId={params.id}
        organizationId={profile.organization_id}
        entityName={claim.claim_number ? `Claim ${claim.claim_number}` : 'Claim'}
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
          {claim.client_id && (
            <Link
              href={`/clients/${claim.client_id}`}
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                {claim.claimant} ({claim.claim_number})
              </h1>
              <button className="text-gray-400 hover:text-yellow-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href={`/claims/${params.id}/edit`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-sm font-medium transition-colors"
            >
              Edit Claim
            </Link>
            <button
              onClick={handleCloseClaim}
              disabled={claim.status === 'CLOSED'}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close Claim
            </button>
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
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => { handleDelete(); setShowMoreMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Claim
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Claim Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <DetailRow label="Origami Claim Number" value={claim.claim_number} />
              <DetailRow label="Claimant" value={claim.claimant} />
              <DetailRow label="Coverage" value={claim.coverage} />
              <DetailRow label="Loss Date" value={formatDate(claim.loss_date)} />
              <DetailRow label="Report Date" value={formatDate(claim.report_date)} />
              <DetailRow
                label="Location"
                value={claim.locations ? `${claim.locations.location_name || claim.locations.company}` : ''}
                isLink={!!claim.location_id}
                href={claim.location_id ? `/clients/${claim.client_id}/locations/${claim.location_id}` : ''}
              />
              <DetailRow label="Property Name" value={claim.property_name} />
              <DetailRow label="Claim Description" value={claim.loss_description} />
            </div>

            {/* Right Column */}
            <div>
              <DetailRow label="Manually Entered Claim" isCheckbox checked={claim.manually_entered_claim} />
              <DetailRow label="Loss Summary Claim" isCheckbox checked={claim.loss_summary_claim} />
              <DetailRow
                label="Policy"
                value={claim.policy_name || claim.policy_number}
                isLink={!!claim.policy_number}
                href="#"
              />
              <DetailRow label="Policy Named Insured" value={claim.policy_named_insured} />
              <DetailRow
                label="Carrier"
                value={claim.carrier}
                isLink={!!claim.carrier}
                href="#"
              />
              <DetailRow label="Wholesaler" value={claim.wholesaler} />
              <DetailRow label="Carrier Policy Number" value={claim.carrier_policy_number} />
              <DetailRow label="Carrier Policy Effective Date" value={formatDate(claim.carrier_policy_effective_date)} />
              <DetailRow label="Cause" value={claim.cause_of_loss} />
              <DetailRow label="Loss Description" value={claim.loss_description} />
            </div>
          </div>

          {/* Full Details Toggle */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-[#006B7D] hover:text-[#008BA3] text-sm font-medium flex items-center gap-1 mx-auto"
            >
              <svg className={`w-4 h-4 transition-transform ${showFullDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Full Details
            </button>

            {showFullDetails && (
              <div className="mt-4 text-left grid grid-cols-2 gap-8">
                <div>
                  <DetailRow label="TPA Claim Number" value={claim.tpa_claim_number} />
                  <DetailRow label="Claim Type" value={claim.claim_type} />
                  <DetailRow label="Status" value={claim.status} />
                  <DetailRow label="Closed Date" value={formatDate(claim.closed_date)} />
                </div>
                <div>
                  <DetailRow label="Adjuster Name" value={claim.adjuster_name} />
                  <DetailRow label="Adjuster Email" value={claim.adjuster_email} />
                  <DetailRow label="Adjuster Phone" value={claim.adjuster_phone} />
                  <DetailRow label="Attorney Name" value={claim.attorney_name} />
                  <DetailRow label="Attorney Firm" value={claim.attorney_firm} />
                </div>
                {claim.notes && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500 mb-1">Notes:</div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{claim.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Current Financials Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#006B7D]">Current Financials</h2>
            <div className="flex items-center gap-4">
              <button className="text-[#006B7D] hover:underline text-sm">Prior Valuation</button>
              <button className="text-[#006B7D] hover:underline text-sm">Show Graph</button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">Categories</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Reserves</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Paid</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Outstanding</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Incurred</th>
              </tr>
            </thead>
            <tbody>
              <FinancialRow category="Bodily Injury" data={getFinancialByCategory('Bodily Injury')} />
              <FinancialRow category="Expense" data={getFinancialByCategory('Expense')} />
              <FinancialRow category="Property Damage" data={getFinancialByCategory('Property Damage')} />
              <FinancialRow category="Legal" data={getFinancialByCategory('Legal')} />
              <FinancialRow category="Other" data={getFinancialByCategory('Other')} />
              <FinancialRow category="Recovery" data={getFinancialByCategory('Recovery')} isExpandable={false} isNegative />
              <FinancialRow category="Subrogation" data={getFinancialByCategory('Subrogation')} isExpandable={false} isNegative />
            </tbody>
          </table>

          {/* Incurred Formula and Totals */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Incurred Formula:</span>
                <select className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-700">
                  <option>Net Incurred</option>
                  <option>Gross Incurred</option>
                </select>
              </div>
              <div className="flex items-center gap-8 text-sm font-semibold">
                <span className="w-24 text-right">{formatCurrency(totals.reserves)}</span>
                <span className="w-24 text-right">{formatCurrency(totals.paid)}</span>
                <span className="w-24 text-right">{formatCurrency(totals.outstanding)}</span>
                <span className="w-24 text-right">{formatCurrency(totals.incurred)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
