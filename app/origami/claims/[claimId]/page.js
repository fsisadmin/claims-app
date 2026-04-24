'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import OrigamiNotesSidebar from '@/components/OrigamiNotesSidebar'
import ClaimInsightsChat from '@/components/ClaimInsightsChat'
import Acord1Form from '@/components/Acord1Form'
import Acord3Form from '@/components/Acord3Form'
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

function ClaimEditField({ label, value, field, editing, edits, onChange, type = 'text', options, isLink, href }) {
  if (!editing) {
    if (type === 'date') return <DetailRow label={label} value={formatDate(value)} />
    return <DetailRow label={label} value={value} isLink={isLink} href={href} />
  }
  if (type === 'select') {
    return (
      <div className="flex py-1.5">
        <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
        <select
          value={edits[field] || ''}
          onChange={(e) => onChange(field, e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#006B7D] bg-white text-gray-900"
        >
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }
  if (type === 'textarea') {
    return (
      <div className="flex py-1.5">
        <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
        <textarea
          value={edits[field] || ''}
          onChange={(e) => onChange(field, e.target.value)}
          rows={3}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#006B7D] bg-white text-gray-900"
        />
      </div>
    )
  }
  return (
    <div className="flex py-1.5">
      <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <input
        type={type}
        value={edits[field] || ''}
        onChange={(e) => onChange(field, e.target.value)}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#006B7D] bg-white text-gray-900"
      />
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
  const [clientLocations, setClientLocations] = useState([])
  const [clientPolicies, setClientPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [editingFinancials, setEditingFinancials] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [editingClaim, setEditingClaim] = useState(false)
  const [claimEdits, setClaimEdits] = useState({})
  const [savingClaim, setSavingClaim] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAcordForm, setShowAcordForm] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
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
      setClientLocations(data.clientLocations || [])
      setClientPolicies(data.clientPolicies || [])

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
        body: JSON.stringify({ claimId: claim.claim_id, updates: editValues }),
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

  const startEditClaim = () => {
    setClaimEdits({
      claimant: claim.claimant || '',
      claim_number: claim.claim_number || '',
      tpa_claim_number: claim.tpa_claim_number || '',
      status: claim.status || 'O',
      loss_date: claim.loss_date || '',
      report_date: claim.report_date || '',
      loss_description: claim.loss_description || '',
      claim_adjuster_name: claim.claim_adjuster_name || '',
      occurrence_number: claim.occurrence_number || '',
      carrier_policy_number: claim.carrier_policy_number || '',
      location_id: claim.location_id || '',
      policy_id: claim.policy_id || '',
      coverage_id: claim.coverage_id || '',
      event_description: claim.event_description || '',
      event_location: claim.event_location || '',
      lawsuit_filed: claim.lawsuit_filed || false,
      suit_date: claim.suit_date || '',
      lead_attorney: claim.lead_attorney || '',
      law_firm: claim.law_firm || '',
      defense_counsel_attorney: claim.defense_counsel_attorney || '',
      defense_counsel_firm: claim.defense_counsel_firm || '',
      plaintiff_counsel_attorney: claim.plaintiff_counsel_attorney || '',
      plaintiff_counsel_firm: claim.plaintiff_counsel_firm || '',
      case_number: claim.case_number || '',
      docket_number: claim.docket_number || '',
      case_overview: claim.case_overview || '',
    })
    setEditingClaim(true)
  }

  const handleClaimEditChange = (field, value) => {
    setClaimEdits(prev => ({ ...prev, [field]: value }))
  }

  const saveClaimEdits = async () => {
    setSavingClaim(true)
    try {
      const res = await fetch('/api/origami/update-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.claim_id, updates: claimEdits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingClaim(false)
      fetchClaimDetail()
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSavingClaim(false)
    }
  }

  const handleDeleteClaim = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/origami/delete-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.claim_id, confirmation: deleteConfirmation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.back()
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    } finally {
      setDeleting(false)
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
            <StatusBadge status={editingClaim ? claimEdits.status : claim.status} />
          </div>
          <div className="flex items-center gap-2">
            {editingClaim ? (
              <>
                <button
                  onClick={() => setEditingClaim(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  disabled={savingClaim}
                >
                  Cancel
                </button>
                <button
                  onClick={saveClaimEdits}
                  disabled={savingClaim}
                  className="px-3 py-1.5 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg disabled:opacity-50"
                >
                  {savingClaim ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                {(() => {
                  const covId = claim.coverage_id
                  const isGL = covId === 40
                  const isProp = covId === 50
                  const acordLabel = isGL ? 'ACORD 3' : isProp ? 'ACORD 1' : 'ACORD'
                  return (
                    <button
                      onClick={() => setShowAcordForm(true)}
                      className="px-3 py-1.5 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {acordLabel}
                    </button>
                  )
                })()}
                <button
                  onClick={startEditClaim}
                  className="px-3 py-1.5 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Claim
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Claim Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <ClaimEditField label="Claim Number" value={claim.claim_number} field="claim_number" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
              <ClaimEditField label="TPA Claim Number" value={claim.tpa_claim_number} field="tpa_claim_number" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
              <ClaimEditField label="Claimant" value={claim.claimant} field="claimant" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
              <ClaimEditField label="Loss Date" value={claim.loss_date} field="loss_date" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="date" />
              <ClaimEditField label="Report Date" value={claim.report_date} field="report_date" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="date" />
              <ClaimEditField
                label="Location"
                value={locationDesc}
                field="location_id"
                editing={editingClaim}
                edits={claimEdits}
                onChange={handleClaimEditChange}
                type="select"
                options={[
                  { value: '', label: '— No Location —' },
                  ...clientLocations.map(l => ({
                    value: l.location_id,
                    label: `${l.description || l.street1 || 'Location ' + l.location_id}${l.city ? ' — ' + l.city : ''}`,
                  }))
                ]}
                isLink={!!(location?.app_location_id && location?.app_client_id)}
                href={location?.app_location_id && location?.app_client_id ? `/clients/${location.app_client_id}/locations/${location.app_location_id}` : ''}
              />
              {!editingClaim && locationAddress && (
                <DetailRow label="Location Address" value={locationAddress} />
              )}
              <ClaimEditField label="Loss Description" value={claim.loss_description} field="loss_description" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="textarea" />
            </div>

            {/* Right Column */}
            <div>
              <ClaimEditField
                label="Policy"
                value={policy ? `${policy.policy_number} — ${policy.description || ''}`.trim() : ''}
                field="policy_id"
                editing={editingClaim}
                edits={claimEdits}
                onChange={handleClaimEditChange}
                type="select"
                options={[
                  { value: '', label: '— No Policy —' },
                  ...clientPolicies.map(p => ({
                    value: p.policy_id,
                    label: `${p.policy_number}${p.description ? ' — ' + p.description : ''}`,
                  }))
                ]}
                isLink={!!policy}
                href={policy ? `/origami/policies/${policy.policy_id}` : ''}
              />
              <ClaimEditField label="Carrier Policy #" value={claim.carrier_policy_number} field="carrier_policy_number" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
              <ClaimEditField
                label="Coverage"
                value={{ 20: 'Auto Physical Damage', 40: 'General Liability', 50: 'Property', 60: 'Workers Compensation' }[claim.coverage_id] || ''}
                field="coverage_id"
                editing={editingClaim}
                edits={claimEdits}
                onChange={handleClaimEditChange}
                type="select"
                options={[
                  { value: '', label: '— Select Coverage —' },
                  { value: 40, label: 'General Liability (GL)' },
                  { value: 50, label: 'Property' },
                  { value: 20, label: 'Auto Physical Damage' },
                  { value: 60, label: 'Workers Compensation' },
                ]}
              />
              <ClaimEditField label="Adjuster" value={claim.claim_adjuster_name} field="claim_adjuster_name" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
              <ClaimEditField label="Occurrence #" value={claim.occurrence_number} field="occurrence_number" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
              <ClaimEditField
                label="Status"
                value={claim.status === 'O' ? 'Open' : claim.status === 'C' ? 'Closed' : claim.status === 'R' ? 'Reopened' : claim.status}
                field="status"
                editing={editingClaim}
                edits={claimEdits}
                onChange={handleClaimEditChange}
                type="select"
                options={[
                  { value: 'O', label: 'Open' },
                  { value: 'C', label: 'Closed' },
                  { value: 'R', label: 'Reopened' },
                ]}
              />
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
                  <ClaimEditField label="Event Description" value={claim.event_description} field="event_description" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="textarea" />
                  <ClaimEditField label="Event Location" value={claim.event_location} field="event_location" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Suit Filed" value={claim.lawsuit_filed ? 'Yes' : 'No'} field="lawsuit_filed" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="select" options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} />
                  <ClaimEditField label="Suit Date" value={claim.suit_date} field="suit_date" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="date" />
                  <DetailRow label="Settlement Date" value={formatDate(claim.settlement_date)} />
                  <DetailRow label="First Close Date" value={formatDate(claim.first_close_date)} />
                  <DetailRow label="Last Close Date" value={formatDate(claim.last_close_date)} />
                  <DetailRow label="Last Reopen Date" value={formatDate(claim.last_reopen_date)} />
                </div>
                <div>
                  <ClaimEditField label="Lead Attorney" value={claim.lead_attorney} field="lead_attorney" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Law Firm" value={claim.law_firm} field="law_firm" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Defense Counsel" value={claim.defense_counsel_attorney} field="defense_counsel_attorney" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Defense Firm" value={claim.defense_counsel_firm} field="defense_counsel_firm" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Plaintiff Counsel" value={claim.plaintiff_counsel_attorney} field="plaintiff_counsel_attorney" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Plaintiff Firm" value={claim.plaintiff_counsel_firm} field="plaintiff_counsel_firm" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Case Number" value={claim.case_number} field="case_number" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                  <ClaimEditField label="Docket Number" value={claim.docket_number} field="docket_number" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} />
                </div>
                <div className="col-span-2">
                  <ClaimEditField label="Case Overview" value={claim.case_overview} field="case_overview" editing={editingClaim} edits={claimEdits} onChange={handleClaimEditChange} type="textarea" />
                </div>
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
        {/* Danger Zone */}
        <div className="mt-8 border border-red-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Permanently delete this claim and all associated data.</p>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirmation('') }}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Claim
            </button>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showAcordForm && (
        claim.coverage_id === 40 ? (
          <Acord3Form
            claimId={claim.claim_id}
            claimNumber={claim.claim_number}
            onClose={() => setShowAcordForm(false)}
          />
        ) : (
          <Acord1Form
            claimId={claim.claim_id}
            claimNumber={claim.claim_number}
            onClose={() => setShowAcordForm(false)}
          />
        )
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-red-600">Delete Claim</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-4">
                This action is permanent and cannot be undone. All notes and files associated with this claim will also be deleted.
              </p>
              <p className="text-sm text-gray-700 mb-3">
                To confirm, type <span className="font-mono font-semibold text-red-600">delete {claim.claim_number}</span> below:
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder={`delete ${claim.claim_number}`}
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClaim}
                disabled={deleting || deleteConfirmation.toLowerCase().trim() !== `delete ${claim.claim_number}`.toLowerCase().trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
