'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
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
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

// Status badge component
function StatusBadge({ status }) {
  const colors = {
    OPEN: 'text-blue-700 font-semibold',
    CLOSED: 'text-red-700 font-semibold',
    PENDING: 'text-amber-700 font-semibold',
    DENIED: 'text-gray-700 font-semibold',
  }
  return <span className={colors[status] || 'text-gray-600'}>{status}</span>
}

export default function ClaimsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  // Data states
  const [claims, setClaims] = useState([])
  const [clients, setClients] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter states
  const [filters, setFilters] = useState({
    claimNumber: '',
    claimant: '',
    coverage: 'All',
    status: 'All',
    location: '',
    lossDateFrom: '',
    lossDateTo: '',
    clientName: '',
  })

  // Recently viewed (stored in localStorage)
  const [recentlyViewed, setRecentlyViewed] = useState([])

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'report_date', direction: 'desc' })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)

  // Load recently viewed from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentlyViewedClaims')
    if (stored) {
      setRecentlyViewed(JSON.parse(stored))
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch claims, clients, and locations
  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch claims with client and location info
      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select(`
          *,
          clients:client_id(id, name),
          locations:location_id(id, location_name, company)
        `)
        .eq('organization_id', profile.organization_id)
        .order('report_date', { ascending: false })

      if (claimsError) throw claimsError

      // Fetch clients for filter dropdown
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('name')

      if (clientsError) throw clientsError

      // Fetch locations for filter dropdown
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, location_name, company')
        .eq('organization_id', profile.organization_id)
        .order('location_name')

      if (locationsError) throw locationsError

      setClaims(claimsData || [])
      setClients(clientsData || [])
      setLocations(locationsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id])

  useEffect(() => {
    if (user && profile) {
      fetchData()
    }
  }, [user, profile, fetchData])

  // Get unique coverage types from claims
  const coverageTypes = useMemo(() => {
    const types = new Set(claims.map(c => c.coverage).filter(Boolean))
    return Array.from(types).sort()
  }, [claims])

  // Filtered and sorted claims
  const filteredClaims = useMemo(() => {
    let result = [...claims]

    // Apply filters
    if (filters.claimNumber) {
      result = result.filter(c =>
        c.claim_number?.toLowerCase().includes(filters.claimNumber.toLowerCase())
      )
    }
    if (filters.claimant) {
      result = result.filter(c =>
        c.claimant?.toLowerCase().includes(filters.claimant.toLowerCase())
      )
    }
    if (filters.coverage !== 'All') {
      result = result.filter(c => c.coverage === filters.coverage)
    }
    if (filters.status !== 'All') {
      result = result.filter(c => c.status === filters.status)
    }
    if (filters.location) {
      result = result.filter(c =>
        c.locations?.location_name?.toLowerCase().includes(filters.location.toLowerCase()) ||
        c.locations?.company?.toLowerCase().includes(filters.location.toLowerCase()) ||
        c.property_name?.toLowerCase().includes(filters.location.toLowerCase())
      )
    }
    if (filters.lossDateFrom) {
      result = result.filter(c => c.loss_date >= filters.lossDateFrom)
    }
    if (filters.lossDateTo) {
      result = result.filter(c => c.loss_date <= filters.lossDateTo)
    }
    if (filters.clientName) {
      result = result.filter(c =>
        c.clients?.name?.toLowerCase().includes(filters.clientName.toLowerCase())
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      // Handle nested values
      if (sortConfig.key === 'client_name') {
        aVal = a.clients?.name
        bVal = b.clients?.name
      } else if (sortConfig.key === 'location_name') {
        aVal = a.locations?.location_name || a.property_name
        bVal = b.locations?.location_name || b.property_name
      }

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal?.toLowerCase() || ''
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [claims, filters, sortConfig])

  // Paginated claims
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredClaims.slice(start, start + pageSize)
  }, [filteredClaims, currentPage, pageSize])

  const totalPages = Math.ceil(filteredClaims.length / pageSize)

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      claimNumber: '',
      claimant: '',
      coverage: 'All',
      status: 'All',
      location: '',
      lossDateFrom: '',
      lossDateTo: '',
      clientName: '',
    })
    setCurrentPage(1)
  }

  // Handle claim click - add to recently viewed
  const handleClaimClick = (claim) => {
    const recent = [
      { id: claim.id, claim_number: claim.claim_number, claimant: claim.claimant },
      ...recentlyViewed.filter(r => r.id !== claim.id),
    ].slice(0, 10)
    setRecentlyViewed(recent)
    localStorage.setItem('recentlyViewedClaims', JSON.stringify(recent))
    router.push(`/claims/${claim.id}`)
  }

  // Sort indicator
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <span className="text-gray-300 ml-1">↕</span>
    }
    return (
      <span className="text-[#006B7D] ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D]"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Claims</h1>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/claims/add')}
                className="bg-[#006B7D] hover:bg-[#008BA3] text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                New Claim
              </button>
              <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
                More ▼
              </button>
            </div>
          </div>

          {/* Quick Filters / Views */}
          <div className="bg-white rounded-lg shadow-sm mb-4 px-4 py-3 flex items-center gap-6 text-sm">
            <button className="text-[#006B7D] font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              All Claims
            </button>
            <button className="text-gray-600 hover:text-[#006B7D] transition-colors">Edit Criteria</button>
            <button className="text-gray-600 hover:text-[#006B7D] transition-colors">Edit Columns</button>
            <button className="text-gray-600 hover:text-[#006B7D] transition-colors">Prior Valuation</button>
          </div>

          {/* Claims Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
                <p className="mt-4 text-gray-600">Loading claims...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">
                Error loading claims: {error}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('claim_number')}
                      >
                        Claim Number <SortIcon column="claim_number" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('claimant')}
                      >
                        Claimant <SortIcon column="claimant" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('coverage')}
                      >
                        Coverage <SortIcon column="coverage" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('location_name')}
                      >
                        Location <SortIcon column="location_name" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('property_name')}
                      >
                        Property Name <SortIcon column="property_name" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        Status <SortIcon column="status" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('loss_date')}
                      >
                        Loss Date <SortIcon column="loss_date" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('policy_number')}
                      >
                        Policy Number <SortIcon column="policy_number" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('tpa_claim_number')}
                      >
                        TPA Claim Number <SortIcon column="tpa_claim_number" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Loss Description
                      </th>
                      <th
                        className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('total_incurred')}
                      >
                        Total Incurred <SortIcon column="total_incurred" />
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('report_date')}
                      >
                        Report Date ▼ <SortIcon column="report_date" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedClaims.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                          No claims found. Click "New Claim" to add one.
                        </td>
                      </tr>
                    ) : (
                      paginatedClaims.map(claim => (
                        <tr
                          key={claim.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleClaimClick(claim)}
                        >
                          <td className="px-4 py-3">
                            <span className="text-[#006B7D] hover:underline font-medium">
                              {claim.claim_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-900">{claim.claimant}</td>
                          <td className="px-4 py-3 text-gray-600">{claim.coverage}</td>
                          <td className="px-4 py-3">
                            {claim.locations ? (
                              <span className="text-[#006B7D] hover:underline">
                                {claim.locations.location_name || claim.locations.company}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{claim.property_name}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={claim.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(claim.loss_date)}</td>
                          <td className="px-4 py-3 text-gray-600">{claim.policy_number}</td>
                          <td className="px-4 py-3 text-gray-600">{claim.tpa_claim_number}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={claim.loss_description}>
                            {claim.loss_description}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">
                            {formatCurrency(claim.total_incurred)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(claim.report_date)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && filteredClaims.length > pageSize && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredClaims.length)} of {filteredClaims.length} claims
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Filters */}
        <div className="w-72 bg-white border-l border-gray-200 p-4 space-y-6">
          {/* Claim Views */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[#006B7D]">Claim Views</h3>
              <button className="text-sm text-[#006B7D] hover:underline">All Views</button>
            </div>
            <div className="space-y-1 text-sm">
              <button className="block text-[#006B7D] hover:underline">All Claims</button>
              <button className="block text-[#006B7D] hover:underline">Claim Advocate View</button>
            </div>
          </div>

          {/* Filter By */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Filter By</h3>
              <button className="text-sm text-[#006B7D] hover:underline">Advanced Search</button>
            </div>

            <div className="space-y-4">
              {/* Claim Number */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Claim Number</label>
                <input
                  type="text"
                  value={filters.claimNumber}
                  onChange={(e) => handleFilterChange('claimNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>

              {/* Claimant */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Claimant</label>
                <input
                  type="text"
                  value={filters.claimant}
                  onChange={(e) => handleFilterChange('claimant', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>

              {/* Coverage */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Coverage</label>
                <select
                  value={filters.coverage}
                  onChange={(e) => handleFilterChange('coverage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  <option value="All">All</option>
                  <option value="General Liability">General Liability</option>
                  <option value="Property">Property</option>
                  {coverageTypes.filter(t => t !== 'General Liability' && t !== 'Property').map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                >
                  <option value="All">All</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="PENDING">Pending</option>
                  <option value="DENIED">Denied</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Location</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                  <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Loss Date Range */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Loss Date</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={filters.lossDateFrom}
                    onChange={(e) => handleFilterChange('lossDateFrom', e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={filters.lossDateTo}
                    onChange={(e) => handleFilterChange('lossDateTo', e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                  />
                </div>
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Client Name</label>
                <input
                  type="text"
                  value={filters.clientName}
                  onChange={(e) => handleFilterChange('clientName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                />
              </div>

              {/* Search / Clear Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  className="flex-1 bg-[#006B7D] hover:bg-[#008BA3] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Search
                </button>
                <button
                  onClick={clearFilters}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recently Viewed</h3>
              <div className="space-y-2 text-sm">
                {recentlyViewed.map(claim => (
                  <Link
                    key={claim.id}
                    href={`/claims/${claim.id}`}
                    className="block text-[#006B7D] hover:underline"
                  >
                    {claim.claimant} ({claim.claim_number})
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
