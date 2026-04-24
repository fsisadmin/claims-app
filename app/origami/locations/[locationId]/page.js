'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import OrigamiClaimsTable from '@/components/OrigamiClaimsTable'
import OrigamiPoliciesTable from '@/components/OrigamiPoliciesTable'

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex py-1.5">
      <div className="w-44 text-sm text-gray-500 flex-shrink-0">{label}:</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  )
}

export default function OrigamiLocationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [location, setLocation] = useState(null)
  const [claims, setClaims] = useState([])
  const [policies, setPolicies] = useState([])
  const [locationValues, setLocationValues] = useState([])
  const [syncInfo, setSyncInfo] = useState({ isSynced: false, appClientId: null, appLocationId: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [exporting, setExporting] = useState(false)

  const handleExportLossLetter = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/origami/loss-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origamiLocationId: Number(params.locationId),
          organizationId: profile.organization_id,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'Loss Letter.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!params.locationId || !profile?.organization_id) return
    setLoading(true)
    try {
      const res = await fetch('/api/origami/location-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origamiLocationId: Number(params.locationId),
          organizationId: profile.organization_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocation(data.location)
      setClaims(data.claims || [])
      setPolicies(data.policies || [])
      setLocationValues(data.locationValues || [])
      setSyncInfo({
        isSynced: !!data.isSynced,
        appClientId: data.appClientId || null,
        appLocationId: data.appLocationId || null,
      })
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.locationId, profile?.organization_id])

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) fetchData()
  }, [user, profile, fetchData])

  if (authLoading || !profile || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600">Loading location...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-600">{error || 'Location not found'}</p>
            <button onClick={() => router.back()} className="mt-4 text-[#006B7D] hover:underline">Go Back</button>
          </div>
        </main>
      </div>
    )
  }

  const address = [location.street1, location.street2].filter(Boolean).join(', ')
  const cityStateZip = [location.city, location.state_id, location.postal_code].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Back */}
        <div className="mb-4">
          <button onClick={() => router.back()} className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Sync status banner */}
        {syncInfo.isSynced && syncInfo.appClientId && syncInfo.appLocationId ? (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-800">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>This location is synced with FSIS 360.</span>
            </div>
            <a
              href={`/clients/${syncInfo.appClientId}/locations/${syncInfo.appLocationId}`}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            >
              View in FSIS 360 →
            </a>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">This location is not synced with FSIS 360.</p>
                <p className="mt-0.5 text-amber-800">Only Origami claims, policies, and basic address info are available here — SOV details, construction, and risk data from FSIS 360 won&apos;t appear.</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {location.description || location.street1 || `Location ${location.location_id}`}
            </h1>
            {cityStateZip && <p className="text-sm text-gray-500 mt-1">{cityStateZip}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLossLetter}
              disabled={exporting}
              className="px-3 py-2 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting...' : 'Loss Letter'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'details', label: 'Location Details' },
                { id: 'claims', label: 'Claims', count: claims.length },
                { id: 'policies', label: 'Policies', count: policies.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#006B7D] text-[#006B7D]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{tab.count}</span>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-base font-semibold text-[#006B7D] mb-3">Address</h3>
                  <DetailRow label="Name" value={location.description} />
                  <DetailRow label="Display Code" value={location.display_code} />
                  <DetailRow label="Street" value={address} />
                  <DetailRow label="City" value={location.city} />
                  <DetailRow label="State" value={location.state_id} />
                  <DetailRow label="Postal Code" value={location.postal_code} />
                  <DetailRow label="County" value={location.county} />
                  <DetailRow label="Country" value={location.country} />
                  <DetailRow label="FEIN" value={location.fein} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#006B7D] mb-3">Details</h3>
                  <DetailRow label="Location ID" value={location.location_id} />
                  <DetailRow label="Phone" value={location.phone_number} />
                  <DetailRow label="Fax" value={location.fax} />
                  <DetailRow label="Email" value={location.email} />
                  <DetailRow label="Status" value={location.is_inactive ? 'Inactive' : 'Active'} />
                  <DetailRow label="Entry Date" value={formatDate(location.entry_date)} />
                  {location.longitude && location.latitude && (
                    <DetailRow label="Coordinates" value={`${location.latitude}, ${location.longitude}`} />
                  )}
                </div>

                {/* SOV Data if available */}
                {locationValues.length > 0 && (
                  <div className="col-span-2 mt-4">
                    <h3 className="text-base font-semibold text-[#006B7D] mb-3">Schedule of Values</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Policy</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Building</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Contents</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">BI</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Other</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">TIV</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Premium</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {locationValues.map(lv => (
                            <tr key={lv.location_value_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-sm text-gray-900">{lv.policy_number || lv.policy_id}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{lv.building_value ? `$${Number(lv.building_value).toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{lv.contents_value ? `$${Number(lv.contents_value).toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{lv.bi_value ? `$${Number(lv.bi_value).toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{lv.other_value ? `$${Number(lv.other_value).toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-semibold">{lv.total_insured_value ? `$${Number(lv.total_insured_value).toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{lv.premium ? `$${Number(lv.premium).toLocaleString()}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === 'claims' && <OrigamiClaimsTable claims={claims} />}

            {/* Policies Tab */}
            {activeTab === 'policies' && <OrigamiPoliciesTable policies={policies} />}
          </div>
        </div>
      </main>
    </div>
  )
}
