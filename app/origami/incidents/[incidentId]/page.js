'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import OrigamiNotesSidebar from '@/components/OrigamiNotesSidebar'
import { useAuth } from '@/contexts/AuthContext'

function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
      <div className="w-48 text-sm text-gray-500 flex-shrink-0">{label}:</div>
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

function EditableField({ label, value, field, editing, editValues, onChange, type = 'text' }) {
  if (!editing) {
    if (type === 'date') return <DetailRow label={label} value={formatDate(value)} />
    if (type === 'boolean') return <DetailRow label={label} value={value ? 'Yes' : 'No'} />
    return <DetailRow label={label} value={value} />
  }

  if (type === 'select-status') {
    return (
      <div className="flex py-1.5">
        <div className="w-48 text-sm text-gray-500 flex-shrink-0">{label}:</div>
        <select
          value={editValues[field] || ''}
          onChange={(e) => onChange(field, e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#006B7D] bg-white text-gray-900"
        >
          <option value="O">Open</option>
          <option value="C">Closed</option>
          <option value="R">Reopened</option>
        </select>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="flex py-1.5">
        <div className="w-48 text-sm text-gray-500 flex-shrink-0">{label}:</div>
        <textarea
          value={editValues[field] || ''}
          onChange={(e) => onChange(field, e.target.value)}
          rows={3}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#006B7D] bg-white text-gray-900"
        />
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div className="flex py-1.5">
        <div className="w-48 text-sm text-gray-500 flex-shrink-0">{label}:</div>
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={editValues[field] || false}
            onChange={(e) => onChange(field, e.target.checked)}
            className="rounded border-gray-300 text-[#006B7D] focus:ring-[#006B7D]"
          />
          {editValues[field] ? 'Yes' : 'No'}
        </label>
      </div>
    )
  }

  return (
    <div className="flex py-1.5">
      <div className="w-48 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <input
        type={type}
        value={editValues[field] || ''}
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

export default function OrigamiIncidentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()

  const [incident, setIncident] = useState(null)
  const [notes, setNotes] = useState([])
  const [location, setLocation] = useState(null)
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertClaimNumber, setConvertClaimNumber] = useState('')
  const [convertConfirmText, setConvertConfirmText] = useState('')
  const [converting, setConverting] = useState(false)

  const fetchIncidentDetail = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/origami/incident-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: Number(params.incidentId) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load incident')
      setIncident(data.incident)
      setNotes(data.notes || [])
      setLocation(data.location)
      setClaims(data.claims || [])
    } catch (err) {
      console.error('Error fetching origami incident:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.incidentId])

  const startEditing = () => {
    setEditValues({
      claimant: incident.claimant || '',
      loss_date: incident.loss_date || '',
      report_date: incident.report_date || '',
      status: incident.status || 'O',
      loss_description: incident.loss_description || '',
      event_description: incident.event_description || '',
      osha_recordable: incident.osha_recordable || false,
      major_injury: incident.major_injury || '',
      supervisor: incident.supervisor || '',
      occupation: incident.occupation || '',
      department_name: incident.department_name || '',
      accident_street1: incident.accident_street1 || '',
      accident_city: incident.accident_city || '',
      accident_postal_code: incident.accident_postal_code || '',
    })
    setEditing(true)
  }

  const handleEditChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }))
  }

  const saveEdits = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/origami/update-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: incident.incident_id, updates: editValues }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditing(false)
      fetchIncidentDetail()
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const convertToClaim = async () => {
    setConverting(true)
    try {
      const res = await fetch('/api/origami/convert-to-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: incident.incident_id,
          claimNumber: convertClaimNumber || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowConvertModal(false)
      router.push(`/origami/claims/${data.claimId}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setConverting(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) fetchIncidentDetail()
  }, [user, profile, fetchIncidentDetail])

  if (authLoading || !profile || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading incident...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">{error || 'Incident not found'}</p>
            <button onClick={() => router.back()} className="mt-4 text-[#006B7D] hover:underline">
              Go Back
            </button>
          </div>
        </main>
      </div>
    )
  }

  const locationDesc = location ? (location.description || location.street1 || `Location ${location.location_id}`) : ''
  const locationAddress = location ? [location.street1, location.city, location.state_id, location.postal_code].filter(Boolean).join(', ') : ''

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Notes Sidebar */}
      <OrigamiNotesSidebar
        notes={notes}
        entityName={incident.incident_number ? `Incident ${incident.incident_number}` : 'Incident'}
        parentDomainId={11}
        parentId={incident.incident_id}
        clientId={incident.client_id}
        authorName={profile?.full_name}
        authorEmail={profile?.email || user?.email}
        onNoteAdded={(note) => setNotes(prev => [note, ...prev])}
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
              {incident.claimant || 'Unknown'} — Incident {incident.incident_number}
            </h1>
            <StatusBadge status={editing ? editValues.status : incident.status} />
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="px-3 py-1.5 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
                {claims.length === 0 && (
                  <button
                    onClick={() => {
                      setConvertClaimNumber('')
                      setConvertConfirmText('')
                      setShowConvertModal(true)
                    }}
                    className="px-3 py-1.5 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Convert to Claim
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Incident Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <DetailRow label="Incident Number" value={incident.incident_number} />
              <EditableField label="Claimant" value={incident.claimant} field="claimant" editing={editing} editValues={editValues} onChange={handleEditChange} />
              <EditableField label="Loss Date" value={incident.loss_date} field="loss_date" editing={editing} editValues={editValues} onChange={handleEditChange} type="date" />
              <EditableField label="Report Date" value={incident.report_date} field="report_date" editing={editing} editValues={editValues} onChange={handleEditChange} type="date" />
              <EditableField label="Loss Description" value={incident.loss_description} field="loss_description" editing={editing} editValues={editValues} onChange={handleEditChange} type="textarea" />
              <EditableField label="Event Description" value={incident.event_description} field="event_description" editing={editing} editValues={editValues} onChange={handleEditChange} type="textarea" />
            </div>

            {/* Right Column */}
            <div>
              <EditableField label="Status" value={incident.status} field="status" editing={editing} editValues={editValues} onChange={handleEditChange} type="select-status" />
              <EditableField label="OSHA Recordable" value={incident.osha_recordable} field="osha_recordable" editing={editing} editValues={editValues} onChange={handleEditChange} type="boolean" />
              <EditableField label="Major Injury" value={incident.major_injury || 'N/A'} field="major_injury" editing={editing} editValues={editValues} onChange={handleEditChange} />
              <DetailRow label="Entry Date" value={formatDate(incident.entry_date)} />
              <DetailRow label="Employer Report Date" value={formatDate(incident.employer_report_date)} />
              <EditableField label="Supervisor" value={incident.supervisor} field="supervisor" editing={editing} editValues={editValues} onChange={handleEditChange} />
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
                  <DetailRow label="Occupation" value={incident.occupation} />
                  <DetailRow label="Department" value={incident.department_name} />
                  <DetailRow label="Employment Status" value={incident.employment_status} />
                  <DetailRow label="Hire Date" value={formatDate(incident.hire_date)} />
                  <DetailRow label="Last Worked Date" value={formatDate(incident.last_worked_date)} />
                  <DetailRow label="Avg Weekly Wage" value={incident.average_weekly_wage ? formatCurrency(incident.average_weekly_wage) : ''} />
                  <DetailRow label="Date of First Treatment" value={formatDate(incident.date_of_first_treatment)} />
                </div>
                <div>
                  <DetailRow label="Hospital" value={incident.hospital_name} />
                  <DetailRow label="Physician" value={incident.physician_name} />
                  <DetailRow label="Activity During Accident" value={incident.activity_during_accident} />
                  <DetailRow label="Object Causing Injury" value={incident.object_causing_injury} />
                  <DetailRow label="Gender" value={incident.gender === 'M' ? 'Male' : incident.gender === 'F' ? 'Female' : incident.gender} />
                  <DetailRow label="Birth Date" value={formatDate(incident.birth_date)} />
                  <DetailRow label="OSHA Case Number" value={incident.osha_case_number} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Card */}
        {location && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#006B7D]">Location</h2>
              {location.app_location_id && location.app_client_id && (
                <button
                  onClick={() => router.push(`/clients/${location.app_client_id}/locations/${location.app_location_id}`)}
                  className="px-3 py-1.5 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View Location Schedule
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <DetailRow
                  label="Name"
                  value={locationDesc}
                  isLink={!!(location.app_location_id && location.app_client_id)}
                  href={location.app_location_id && location.app_client_id ? `/clients/${location.app_client_id}/locations/${location.app_location_id}` : ''}
                />
                <DetailRow label="Address" value={location.street1} />
                {location.street2 && <DetailRow label="Address 2" value={location.street2} />}
                <DetailRow label="City, State, ZIP" value={[location.city, location.state_id, location.postal_code].filter(Boolean).join(', ')} />
              </div>
              <div>
                <DetailRow label="Location Code" value={location.display_code} />
                {location.county && <DetailRow label="County" value={location.county} />}
              </div>
            </div>

            {/* Accident Location (if different from location) */}
            {incident.accident_street1 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Accident Location</h3>
                <DetailRow label="Address" value={incident.accident_street1} />
                <DetailRow label="City, State, ZIP" value={[incident.accident_city, incident.accident_state_id, incident.accident_postal_code].filter(Boolean).join(', ')} />
                {incident.accident_county && <DetailRow label="County" value={incident.accident_county} />}
              </div>
            )}
          </div>
        )}

        {/* Linked Claims Card */}
        {claims.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#006B7D] mb-3">
              Linked Claims ({claims.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-4 text-left font-medium text-gray-600">Claim #</th>
                  <th className="py-2 px-4 text-left font-medium text-gray-600">Claimant</th>
                  <th className="py-2 px-4 text-left font-medium text-gray-600">Loss Date</th>
                  <th className="py-2 px-4 text-center font-medium text-gray-600">Status</th>
                  <th className="py-2 px-4 text-right font-medium text-gray-600">Total Incurred</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr
                    key={c.claim_id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/origami/claims/${c.claim_id}`)}
                  >
                    <td className="py-2 px-4 text-[#006B7D] font-medium hover:underline">{c.claim_number}</td>
                    <td className="py-2 px-4 text-gray-900">{c.claimant || '-'}</td>
                    <td className="py-2 px-4 text-gray-600">{formatDate(c.loss_date)}</td>
                    <td className="py-2 px-4 text-center"><StatusBadge status={c.status} /></td>
                    <td className="py-2 px-4 text-right font-medium text-gray-900">{formatCurrency(c.total_incurred)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Convert to Claim Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConvertModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-[460px] p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Convert Incident to Claim</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will create a new claim from incident {incident.incident_number}. You will be taken to the claim page to fill in the details.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              This action cannot be undone. The incident data (claimant, loss date, location, description) will be copied to the new claim.
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={convertClaimNumber}
                onChange={(e) => setConvertClaimNumber(e.target.value)}
                placeholder={`INC-${incident.incident_number || incident.incident_id}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D]/30 focus:border-[#006B7D] text-gray-900"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="font-semibold text-red-600">convert to claim</span> to confirm
              </label>
              <input
                type="text"
                value={convertConfirmText}
                onChange={(e) => setConvertConfirmText(e.target.value)}
                placeholder="convert to claim"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D]/30 focus:border-[#006B7D] text-gray-900"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                disabled={converting}
              >
                Cancel
              </button>
              <button
                onClick={convertToClaim}
                disabled={converting || convertConfirmText.toLowerCase() !== 'convert to claim'}
                className="px-4 py-2 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {converting ? 'Creating...' : 'Create Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
