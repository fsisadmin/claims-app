'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Link from 'next/link'

function formatCurrency(value) {
  if (value === null || value === undefined || value === 0) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  const styles = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-700',
    renewed: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${styles[s] || 'bg-gray-100 text-gray-700'}`}>
      {status || 'Unknown'}
    </span>
  )
}

function ClaimStatusBadge({ status }) {
  const s = (status || '').toUpperCase()
  const styles = {
    OPEN: 'bg-red-100 text-red-700',
    CLOSED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    DENIED: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[s] || 'bg-gray-100 text-gray-700'}`}>
      {s || 'UNKNOWN'}
    </span>
  )
}

export default function OrigamiPolicyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [policy, setPolicy] = useState(null)
  const [claims, setClaims] = useState([])
  const [locations, setLocations] = useState([])
  const [coverages, setCoverages] = useState([])
  const [carriers, setCarriers] = useState([])
  const [namedInsureds, setNamedInsureds] = useState([])
  const [hasSOV, setHasSOV] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [claimSearch, setClaimSearch] = useState('')
  const [claimSort, setClaimSort] = useState({ key: 'loss_date', dir: 'desc' })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchData() {
      if (!profile?.organization_id || !params.policyId) return

      setLoading(true)
      try {
        const res = await fetch('/api/origami/policy-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            policyId: Number(params.policyId),
            organizationId: profile.organization_id,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setPolicy(data.policy)
        setClaims(data.claims || [])
        setLocations(data.locations || [])
        setCoverages(data.coverages || [])
        setCarriers(data.carriers || [])
        setNamedInsureds(data.namedInsureds || [])
        setHasSOV(data.hasSOV || false)
      } catch (err) {
        console.error('Error fetching policy data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (user && profile) fetchData()
  }, [user, profile, params.policyId])

  const filteredClaims = useMemo(() => {
    let result = [...claims]
    if (claimSearch) {
      const q = claimSearch.toLowerCase()
      result = result.filter(c =>
        (c.claim_number || '').toLowerCase().includes(q) ||
        (c.claimant || '').toLowerCase().includes(q) ||
        (c.loss_description || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let aVal = a[claimSort.key]
      let bVal = b[claimSort.key]
      if (['total_paid', 'total_reserved', 'total_incurred'].includes(claimSort.key)) {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      }
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return claimSort.dir === 'asc' ? cmp : -cmp
    })
    return result
  }, [claims, claimSearch, claimSort])

  const handleClaimSort = (key) => {
    setClaimSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }))
  }

  const ClaimSortIcon = ({ column }) => {
    if (claimSort.key !== column) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="ml-1">{claimSort.dir === 'asc' ? '↑' : '↓'}</span>
  }

  if (authLoading || !profile || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-600 font-medium">{error || 'Policy not found'}</p>
            <button onClick={() => router.back()} className="mt-4 text-[#006B7D] hover:text-[#008BA3] font-medium">
              Go Back
            </button>
          </div>
        </main>
      </div>
    )
  }

  const isExpired = policy.expiration_date && new Date(policy.expiration_date) < new Date()
  const totalTIV = locations.reduce((s, lv) => s + (Number(lv.total_insured_value) || 0), 0)
  const totalLocPremium = locations.reduce((s, lv) => s + (Number(lv.premium) || 0), 0)
  const totalPaid = claims.reduce((s, c) => s + (Number(c.total_paid) || 0), 0)
  const totalReserved = claims.reduce((s, c) => s + (Number(c.total_reserved) || 0), 0)
  const totalIncurred = claims.reduce((s, c) => s + (Number(c.total_incurred) || 0), 0)
  const openClaims = claims.filter(c => (c.status || '').toUpperCase() === 'OPEN').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
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

        {/* Policy Header Card */}
        <div className="bg-white rounded-3xl shadow-md p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-gray-900">{policy.policy_number || 'Policy'}</h1>
                <StatusBadge status={policy.status} />
              </div>
              {policy.description && (
                <p className="text-gray-600 text-lg">{policy.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200">
              <span className="text-xs font-semibold text-orange-700 uppercase">Origami Policy</span>
            </div>
          </div>

          {/* Policy Detail + Terms Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm mb-8">
            <div>
              <h3 className="text-base font-semibold text-[#006B7D] mb-3">Policy Detail</h3>
              <div className="space-y-2">
                <div className="flex"><div className="w-44 text-gray-500">Policy Number:</div><div className="text-gray-900 font-medium">{policy.policy_number || '—'}</div></div>
                <div className="flex"><div className="w-44 text-gray-500">Description:</div><div className="text-gray-900">{policy.description || '—'}</div></div>
                {carriers.length > 0 && (
                  <div className="flex"><div className="w-44 text-gray-500">Carrier:</div><div className="text-[#006B7D] font-medium">{carriers[0].carrier_name || '—'}</div></div>
                )}
                {carriers.length > 0 && carriers[0].participation && (
                  <div className="flex"><div className="w-44 text-gray-500">Participation:</div><div className="text-gray-900">{carriers[0].participation}%</div></div>
                )}
                {policy.major_coverage_id && (
                  <div className="flex"><div className="w-44 text-gray-500">Coverage ID:</div><div className="text-gray-900">{policy.major_coverage_id}</div></div>
                )}
              </div>
              <h3 className="text-base font-semibold text-[#006B7D] mt-6 mb-3">Premium Details</h3>
              <div className="space-y-2">
                <div className="flex"><div className="w-44 text-gray-500">Premium:</div><div className="text-gray-900 font-medium">{formatCurrency(policy.premium)}</div></div>
                {hasSOV && <div className="flex"><div className="w-44 text-gray-500">Total Location Premium:</div><div className="text-gray-900">{formatCurrency(totalLocPremium)}</div></div>}
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#006B7D] mb-3">Terms</h3>
              <div className="space-y-2">
                <div className="flex"><div className="w-44 text-gray-500">Effective Date:</div><div className="text-gray-900">{formatDate(policy.effective_date)}</div></div>
                <div className="flex">
                  <div className="w-44 text-gray-500">Expiration Date:</div>
                  <div className={isExpired ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                    {formatDate(policy.expiration_date)}
                    {isExpired && <span className="ml-2 text-xs">(Expired)</span>}
                  </div>
                </div>
                <div className="flex"><div className="w-44 text-gray-500">Status:</div><div><StatusBadge status={policy.status} /></div></div>
              </div>
              {(carriers.length > 0 && (carriers[0].limit || carriers[0].per_occurrence_limit || carriers[0].aggregate_limit || carriers[0].deductible || carriers[0].attachment_point)) && (
                <>
                  <h3 className="text-base font-semibold text-[#006B7D] mt-6 mb-3">Limits</h3>
                  <div className="space-y-2">
                    {carriers[0].limit && <div className="flex"><div className="w-44 text-gray-500">Limit:</div><div className="text-gray-900">{formatCurrency(carriers[0].limit)}</div></div>}
                    {carriers[0].per_occurrence_limit && <div className="flex"><div className="w-44 text-gray-500">Per Occurrence:</div><div className="text-gray-900">{formatCurrency(carriers[0].per_occurrence_limit)}</div></div>}
                    {carriers[0].aggregate_limit && <div className="flex"><div className="w-44 text-gray-500">Aggregate:</div><div className="text-gray-900">{formatCurrency(carriers[0].aggregate_limit)}</div></div>}
                    {carriers[0].deductible && <div className="flex"><div className="w-44 text-gray-500">Deductible:</div><div className="text-gray-900">{formatCurrency(carriers[0].deductible)}</div></div>}
                    {carriers[0].sir && <div className="flex"><div className="w-44 text-gray-500">SIR:</div><div className="text-gray-900">{formatCurrency(carriers[0].sir)}</div></div>}
                    {carriers[0].attachment_point && <div className="flex"><div className="w-44 text-gray-500">Attachment Point:</div><div className="text-gray-900">{formatCurrency(carriers[0].attachment_point)}</div></div>}
                    {carriers[0].layer_number && <div className="flex"><div className="w-44 text-gray-500">Layer:</div><div className="text-gray-900">{carriers[0].layer_number}</div></div>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className={`grid ${hasSOV ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
            <div className="bg-gradient-to-br from-[#006B7D]/5 to-[#006B7D]/10 rounded-2xl p-5 shadow-sm border border-[#006B7D]/10">
              <p className="text-xs font-medium text-[#006B7D]/70 mb-2">Locations</p>
              <p className="text-2xl font-semibold text-[#006B7D]">{locations.length}</p>
            </div>
            {hasSOV && (
              <div className="bg-gradient-to-br from-[#006B7D]/5 to-[#006B7D]/10 rounded-2xl p-5 shadow-sm border border-[#006B7D]/10">
                <p className="text-xs font-medium text-[#006B7D]/70 mb-2">Total TIV</p>
                <p className="text-2xl font-semibold text-[#006B7D]">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalTIV)}
                </p>
              </div>
            )}
            <div className="bg-gradient-to-br from-[#006B7D]/5 to-[#006B7D]/10 rounded-2xl p-5 shadow-sm border border-[#006B7D]/10">
              <p className="text-xs font-medium text-[#006B7D]/70 mb-2">Claims</p>
              <p className="text-2xl font-semibold text-[#006B7D]">
                {claims.length}
                {openClaims > 0 && <span className="text-sm text-red-500 ml-2">({openClaims} open)</span>}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#006B7D]/5 to-[#006B7D]/10 rounded-2xl p-5 shadow-sm border border-[#006B7D]/10">
              <p className="text-xs font-medium text-[#006B7D]/70 mb-2">Total Incurred</p>
              <p className="text-2xl font-semibold text-[#006B7D]">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalIncurred)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'coverages', label: 'Policy Coverages', count: coverages.length },
                { id: 'locations', label: 'Covered Locations', count: locations.length },
                { id: 'claims', label: 'Claims', count: claims.length },
                ...(namedInsureds.length > 0 ? [{ id: 'named-insureds', label: 'Named Insureds', count: namedInsureds.length }] : []),
                ...(carriers.length > 1 ? [{ id: 'carriers', label: 'Carriers', count: carriers.length }] : []),
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
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {tab.count}
                    </span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Coverages Tab */}
            {activeTab === 'coverages' && (
              <div>
                {coverages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No coverage details available for this policy</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Coverage</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Limit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Aggregate Limit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Per Occurrence</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deductible</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Premium</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {coverages.map(cov => (
                          <tr key={cov.policy_coverage_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{cov.description || '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{cov.limit ? formatCurrency(cov.limit) : '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{cov.aggregate_limit ? formatCurrency(cov.aggregate_limit) : '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{cov.per_occurrence_limit ? formatCurrency(cov.per_occurrence_limit) : '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{cov.deductible ? formatCurrency(cov.deductible) : '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{cov.premium ? formatCurrency(cov.premium) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Named Insureds Tab */}
            {activeTab === 'named-insureds' && (
              <div>
                {namedInsureds.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No named insureds on this policy</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {namedInsureds.map(ni => (
                      <div key={ni.policy_named_insured_id} className="p-4 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-900 font-medium">{ni.description || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Carriers Tab (only shows if multiple carriers) */}
            {activeTab === 'carriers' && (
              <div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Carrier</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Policy Number</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Participation</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Limit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Premium</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Layer</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {carriers.map(c => (
                        <tr key={c.policy_carrier_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{c.carrier_name || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900">{c.policy_number || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{c.participation ? `${c.participation}%` : '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{c.limit ? formatCurrency(c.limit) : '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{c.premium ? formatCurrency(c.premium) : '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-center">{c.layer_number || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div>
                {locations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No locations on this policy</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {locations.map(lv => {
                      const loc = lv.origami_location
                      const address = loc ? [loc.street1, loc.city, loc.state_id != null ? String(loc.state_id) : null, loc.postal_code].filter(Boolean).join(', ') : null

                      const inner = (
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-[#006B7D]/30 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {lv.description || loc?.description || 'Unknown Location'}
                              </p>
                              {address && (
                                <p className="text-xs text-gray-500">{address}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {hasSOV && (
                              <div className="flex items-center gap-6 text-right">
                                <div>
                                  <p className="text-xs text-gray-500">Building</p>
                                  <p className="font-medium text-sm text-gray-900">{formatCurrency(lv.building_value)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Contents</p>
                                  <p className="font-medium text-sm text-gray-900">{formatCurrency(lv.contents_value)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">BI</p>
                                  <p className="font-medium text-sm text-gray-900">{formatCurrency(lv.bi_value)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">TIV</p>
                                  <p className="font-semibold text-sm text-gray-900">{formatCurrency(lv.total_insured_value)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Premium</p>
                                  <p className="font-medium text-sm text-gray-900">{formatCurrency(lv.premium)}</p>
                                </div>
                              </div>
                            )}
                            {lv.app_location_id && (
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )

                      if (lv.app_location_id) {
                        return (
                          <Link key={lv.location_value_id} href={`/clients/${lv.origami_location?.client_id || ''}/locations/${lv.app_location_id}`}>
                            {inner}
                          </Link>
                        )
                      }
                      return <div key={lv.location_value_id}>{inner}</div>
                    })}

                    {/* Totals - only show when SOV data exists */}
                    {hasSOV && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                        <div className="flex items-center gap-3">
                          <div className="w-5" />
                          <p className="font-semibold text-gray-700 text-sm">Totals ({locations.length} locations)</p>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-xs text-gray-500">Building</p>
                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(locations.reduce((s, lv) => s + (Number(lv.building_value) || 0), 0))}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Contents</p>
                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(locations.reduce((s, lv) => s + (Number(lv.contents_value) || 0), 0))}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">BI</p>
                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(locations.reduce((s, lv) => s + (Number(lv.bi_value) || 0), 0))}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">TIV</p>
                            <p className="font-bold text-sm text-gray-900">{formatCurrency(totalTIV)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Premium</p>
                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(totalLocPremium)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === 'claims' && (
              <div>
                {/* Claims Summary */}
                <div className="flex items-center gap-6 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">{claims.length}</span> claims
                    {openClaims > 0 && <span className="ml-2 text-red-600 font-semibold">{openClaims} open</span>}
                  </div>
                  <div className="text-xs text-gray-600">Paid: <span className="font-semibold">{formatCurrency(totalPaid)}</span></div>
                  <div className="text-xs text-gray-600">Reserved: <span className="font-semibold">{formatCurrency(totalReserved)}</span></div>
                  <div className="text-xs text-gray-600">Incurred: <span className="font-semibold">{formatCurrency(totalIncurred)}</span></div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search claims..."
                    value={claimSearch}
                    onChange={e => setClaimSearch(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#006B7D] w-64"
                  />
                  <span className="ml-auto text-xs text-gray-500">{filteredClaims.length} results</span>
                </div>

                {/* Claims Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('claim_number')}>
                          Claim # <ClaimSortIcon column="claim_number" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('claimant')}>
                          Claimant <ClaimSortIcon column="claimant" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('status')}>
                          Status <ClaimSortIcon column="status" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('loss_date')}>
                          Loss Date <ClaimSortIcon column="loss_date" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Location</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('total_paid')}>
                          Total Paid <ClaimSortIcon column="total_paid" />
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('total_reserved')}>
                          Reserved <ClaimSortIcon column="total_reserved" />
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleClaimSort('total_incurred')}>
                          Incurred <ClaimSortIcon column="total_incurred" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredClaims.map(c => (
                        <tr key={c.claim_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{c.claim_number || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">{c.claimant || '—'}</td>
                          <td className="px-4 py-2.5"><ClaimStatusBadge status={c.status} /></td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(c.loss_date)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">{c.location_name || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{formatCurrency(c.total_paid)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{formatCurrency(c.total_reserved)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{formatCurrency(c.total_incurred)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-500 max-w-xs truncate" title={c.loss_description}>{c.loss_description || '—'}</td>
                        </tr>
                      ))}
                      {filteredClaims.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                            No claims found{claimSearch ? ` matching "${claimSearch}"` : ' for this policy'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
