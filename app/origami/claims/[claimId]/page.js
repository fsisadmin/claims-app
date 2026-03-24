'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import OrigamiNotesSidebar from '@/components/OrigamiNotesSidebar'
import ClaimInsightsChat from '@/components/ClaimInsightsChat'
import { useAuth } from '@/contexts/AuthContext'

function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function DetailRow({ label, value, isLink, href }) {
  return (
    <div className="flex py-1.5">
      <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <div className="flex-1 text-sm text-gray-900">
        {isLink && href ? (
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

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase()
  const styles = {
    O: { label: 'OPEN', className: 'bg-red-100 text-red-700' },
    C: { label: 'CLOSED', className: 'bg-green-100 text-green-700' },
    R: { label: 'REOPENED', className: 'bg-amber-100 text-amber-700' },
  }
  const config = styles[s] || { label: s || 'UNKNOWN', className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

function EditableCell({ value, editing, field, onChange }) {
  if (!editing) {
    return <td className="py-2 px-4 text-sm text-right text-gray-700">{formatCurrency(value)}</td>
  }
  return (
    <td className="py-1 px-2">
      <input
        type="number"
        step="0.01"
        value={value || 0}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full text-right text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#006B7D] focus:border-[#006B7D] bg-white text-gray-900"
      />
    </td>
  )
}

function FinancialRow({ label, paid, reserved, recovery, editing, catIndex, onChange }) {
  const outstanding = (Number(reserved) || 0) - (Number(paid) || 0)
  const incurred = (Number(paid) || 0) + (Number(reserved) || 0) - (Number(recovery) || 0)
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-4 text-sm text-gray-700">{label}</td>
      <EditableCell value={reserved} editing={editing} field={`reserve${catIndex}`} onChange={onChange} />
      <EditableCell value={paid} editing={editing} field={`paid${catIndex}`} onChange={onChange} />
      <EditableCell value={recovery} editing={editing} field={`recovery${catIndex}`} onChange={onChange} />
      <td className="py-2 px-4 text-sm text-right text-gray-700 bg-gray-50">{formatCurrency(outstanding)}</td>
      <td className="py-2 px-4 text-sm text-right text-gray-700 font-medium bg-gray-50">{formatCurrency(incurred)}</td>
    </tr>
  )
}

export default function OrigamiClaimDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [claim, setClaim] = useState(null)
  const [notes, setNotes] = useState([])
  const [files, setFiles] = useState([])
  const [location, setLocation] = useState(null)
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [editingFinancials, setEditingFinancials] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const DEFAULT_CATEGORIES = {
    1: 'Bodily Injury',
    2: 'Expense',
    3: 'Property Damage',
    4: 'Legal',
    5: 'Other',
    6: 'Recovery',
    7: 'Subrogation',
  }
  const [categoryLabels, setCategoryLabels] = useState(DEFAULT_CATEGORIES)
  const [editLabels, setEditLabels] = useState({})

  const fetchClaimDetail = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/origami/claim-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: Number(params.claimId) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load claim')
      setClaim(data.claim)
      setNotes(data.notes || [])
      setFiles(data.files || [])
      setLocation(data.location)
      setPolicy(data.policy)

      // Fetch custom category labels (merge with defaults)
      try {
        const catRes = await fetch('/api/origami/financial-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', clientId: data.claim.client_id }),
        })
        const catData = await catRes.json()
        if (catData.labels && Object.keys(catData.labels).length > 0) {
          setCategoryLabels(prev => ({ ...prev, ...catData.labels }))
        }
      } catch (e) { /* use defaults */ }
    } catch (err) {
      console.error('Error fetching origami claim:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.claimId])

  const startEditFinancials = () => {
    const vals = {}
    for (let i = 1; i <= 7; i++) {
      vals[`paid${i}`] = Number(claim[`paid${i}`]) || 0
      vals[`reserve${i}`] = Number(claim[`reserve${i}`]) || 0
      vals[`recovery${i}`] = Number(claim[`recovery${i}`]) || 0
    }
    setEditValues(vals)
    setEditLabels({ ...categoryLabels })
    setEditingFinancials(true)
  }

  const handleLabelChange = (index, value) => {
    setEditLabels(prev => ({ ...prev, [index]: value }))
  }

  const handleFinancialChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value === '' ? 0 : Number(value) }))
  }

  const saveFinancials = async () => {
    setSaving(true)
    try {
      // Save financials
      const res = await fetch('/api/origami/update-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.claim_id, financials: editValues }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Save category labels
      const categories = Object.entries(editLabels)
        .filter(([_, label]) => label && label.trim())
        .map(([index, label]) => ({ index: Number(index), label: label.trim() }))
      if (categories.length > 0) {
        await fetch('/api/origami/financial-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', clientId: claim.client_id, categories }),
        })
      }

      setCategoryLabels({ ...editLabels })
      setEditingFinancials(false)
      fetchClaimDetail() // reload
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) fetchClaimDetail()
  }, [user, profile, fetchClaimDetail])

  if (authLoading || !profile || loading) {
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
            <p className="text-red-800 font-medium">{error || 'Claim not found'}</p>
            <button onClick={() => router.back()} className="mt-4 text-[#006B7D] hover:underline">
              Go Back
            </button>
          </div>
        </main>
      </div>
    )
  }

  const locationDesc = location ? (location.description || location.street1 || `Location ${location.location_id}`) : ''
  const locationAddress = location ? [location.city, location.state_id, location.postal_code].filter(Boolean).join(', ') : ''

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Notes Sidebar */}
      <OrigamiNotesSidebar
        notes={notes}
        files={files}
        entityName={claim.claim_number ? `Claim ${claim.claim_number}` : 'Claim'}
      />

      <ClaimInsightsChat
        claimId={claim.claim_id}
        claimNumber={claim.claim_number}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button */}
        <div className="mb-4">
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {claim.claimant || 'Unknown Claimant'} ({claim.claim_number})
            </h1>
            <StatusBadge status={claim.status} />
          </div>
          {notes.length > 0 && (
            <span className="text-sm text-gray-500">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Main Claim Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <DetailRow label="Claim Number" value={claim.claim_number} />
              <DetailRow label="TPA Claim Number" value={claim.tpa_claim_number} />
              <DetailRow label="Claimant" value={claim.claimant} />
              <DetailRow label="Loss Date" value={formatDate(claim.loss_date)} />
              <DetailRow label="Report Date" value={formatDate(claim.report_date)} />
              <DetailRow
                label="Location"
                value={locationDesc}
              />
              {locationAddress && (
                <DetailRow label="Location Address" value={locationAddress} />
              )}
              <DetailRow label="Loss Description" value={claim.loss_description} />
            </div>

            {/* Right Column */}
            <div>
              <DetailRow
                label="Policy"
                value={policy ? `${policy.policy_number} — ${policy.description || ''}`.trim() : ''}
                isLink={!!policy}
                href={policy ? `/origami/policies/${policy.policy_id}` : ''}
              />
              <DetailRow label="Carrier Policy #" value={claim.carrier_policy_number} />
              <DetailRow label="Adjuster" value={claim.claim_adjuster_name} />
              <DetailRow label="Occurrence #" value={claim.occurrence_number} />
              <DetailRow label="Status" value={claim.status === 'O' ? 'Open' : claim.status === 'C' ? 'Closed' : claim.status === 'R' ? 'Reopened' : claim.status} />
              <DetailRow label="Entry Date" value={formatDate(claim.entry_date)} />
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
                  <DetailRow label="Event Description" value={claim.event_description} />
                  <DetailRow label="Event Location" value={claim.event_location} />
                  <DetailRow label="Suit Filed" value={claim.lawsuit_filed ? 'Yes' : 'No'} />
                  <DetailRow label="Suit Date" value={formatDate(claim.suit_date)} />
                  <DetailRow label="Settlement Date" value={formatDate(claim.settlement_date)} />
                  <DetailRow label="First Close Date" value={formatDate(claim.first_close_date)} />
                  <DetailRow label="Last Close Date" value={formatDate(claim.last_close_date)} />
                  <DetailRow label="Last Reopen Date" value={formatDate(claim.last_reopen_date)} />
                </div>
                <div>
                  <DetailRow label="Lead Attorney" value={claim.lead_attorney} />
                  <DetailRow label="Law Firm" value={claim.law_firm} />
                  <DetailRow label="Defense Counsel" value={claim.defense_counsel_attorney} />
                  <DetailRow label="Defense Firm" value={claim.defense_counsel_firm} />
                  <DetailRow label="Plaintiff Counsel" value={claim.plaintiff_counsel_attorney} />
                  <DetailRow label="Plaintiff Firm" value={claim.plaintiff_counsel_firm} />
                  <DetailRow label="Case Number" value={claim.case_number} />
                  <DetailRow label="Docket Number" value={claim.docket_number} />
                </div>
                {claim.case_overview && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500 mb-1">Case Overview:</div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{claim.case_overview}</p>
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
            {editingFinancials ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingFinancials(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveFinancials}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg disabled:opacity-50 flex items-center gap-1"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                onClick={startEditFinancials}
                className="px-3 py-1.5 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-600">Category</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Reserves</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Paid</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600">Recovery</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600 bg-gray-50">Outstanding</th>
                <th className="py-2 px-4 text-right text-sm font-medium text-gray-600 bg-gray-50">Incurred</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7].map(i => {
                const paid = editingFinancials ? (editValues[`paid${i}`] || 0) : (Number(claim[`paid${i}`]) || 0)
                const reserved = editingFinancials ? (editValues[`reserve${i}`] || 0) : (Number(claim[`reserve${i}`]) || 0)
                const recovery = editingFinancials ? (editValues[`recovery${i}`] || 0) : (Number(claim[`recovery${i}`]) || 0)
                // In view mode, hide empty rows unless they have a label. In edit mode, show all.
                if (!editingFinancials && paid === 0 && reserved === 0 && recovery === 0 && !categoryLabels[i]) return null
                const label = categoryLabels[i] || `Category ${i}`
                return (
                  <FinancialRow
                    key={i}
                    catIndex={i}
                    label={label}
                    paid={paid}
                    reserved={reserved}
                    recovery={recovery}
                    editing={editingFinancials}
                    onChange={handleFinancialChange}
                  />
                )
              })}
            </tbody>
          </table>

          {/* Totals Row */}
          {(() => {
            const src = editingFinancials ? editValues : claim
            const tPaid = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(editingFinancials ? src[`paid${i}`] : claim[`paid${i}`]) || 0), 0)
            const tReserved = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(editingFinancials ? src[`reserve${i}`] : claim[`reserve${i}`]) || 0), 0)
            const tRecovery = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(editingFinancials ? src[`recovery${i}`] : claim[`recovery${i}`]) || 0), 0)
            const tIncurred = tPaid + tReserved - tRecovery
            return (
          <div className="mt-4 pt-4 border-t-2 border-gray-300">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">TOTALS</span>
              </div>
              <div className="flex items-center text-sm font-bold text-gray-900 gap-1">
                <span className="w-28 text-right px-4">
                  <span className="text-xs text-gray-500 block">Reserved</span>
                  {formatCurrency(tReserved)}
                </span>
                <span className="w-28 text-right px-4">
                  <span className="text-xs text-gray-500 block">Paid</span>
                  {formatCurrency(tPaid)}
                </span>
                <span className="w-28 text-right px-4">
                  <span className="text-xs text-gray-500 block">Recovery</span>
                  {formatCurrency(tRecovery)}
                </span>
                <span className="w-32 text-right px-4 bg-[#006B7D]/10 py-2 rounded text-[#006B7D]">
                  <span className="text-xs block">Incurred</span>
                  {formatCurrency(tIncurred)}
                </span>
              </div>
            </div>
          </div>
            )
          })()}
        </div>
      </main>
    </div>
  )
}
