'use client'

import { useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {displayStatus}
    </span>
  )
}

export default function PoliciesTable({ policies, clientId, locations, onAddPolicy }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'expiration_date', direction: 'asc' })
  const [statusFilter, setStatusFilter] = useState('All')
  const [expandedPolicies, setExpandedPolicies] = useState(new Set())

  // Toggle policy expansion
  const toggleExpanded = (policyId) => {
    setExpandedPolicies(prev => {
      const next = new Set(prev)
      if (next.has(policyId)) {
        next.delete(policyId)
      } else {
        next.add(policyId)
      }
      return next
    })
  }

  // Filter and sort policies
  const filteredPolicies = useMemo(() => {
    let result = [...policies]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(policy =>
        policy.policy_number?.toLowerCase().includes(query) ||
        policy.policy_type?.toLowerCase().includes(query) ||
        policy.carrier?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(policy => policy.status === statusFilter.toLowerCase())
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

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
  }, [policies, searchQuery, statusFilter, sortConfig])

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Sort indicator
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <span className="text-gray-300 ml-1">↕</span>
    }
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
  }

  // Check if policy is expiring soon (within 30 days)
  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expDate <= thirtyDaysFromNow && expDate >= now
  }

  // Check if policy is expired
  const isExpired = (expirationDate) => {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  // Get unique statuses for filter
  const statuses = ['All', 'Active', 'Expired', 'Cancelled', 'Pending', 'Renewed']

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onAddPolicy}
            className="flex items-center gap-2 bg-[#006B7D] hover:bg-[#008BA3] text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Policy
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D]"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] w-64"
            />
          </div>

          <span className="text-sm text-gray-500">{filteredPolicies.length} policies</span>
        </div>
      </div>

      {/* Table */}
      {filteredPolicies.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No policies found</p>
          <button
            onClick={onAddPolicy}
            className="mt-4 text-[#006B7D] hover:text-[#008BA3] font-medium"
          >
            Add the first policy
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-10 px-3 py-3"></th>
                <th
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('policy_number')}
                >
                  Policy # <SortIcon column="policy_number" />
                </th>
                <th
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('policy_type')}
                >
                  Type <SortIcon column="policy_type" />
                </th>
                <th
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('carrier')}
                >
                  Carrier <SortIcon column="carrier" />
                </th>
                <th
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('effective_date')}
                >
                  Effective <SortIcon column="effective_date" />
                </th>
                <th
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('expiration_date')}
                >
                  Expiration <SortIcon column="expiration_date" />
                </th>
                <th
                  className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('premium')}
                >
                  Premium <SortIcon column="premium" />
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Locations
                </th>
                <th
                  className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon column="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPolicies.map((policy) => {
                const policyLocations = policy.policy_locations || []
                const isExpanded = expandedPolicies.has(policy.id)

                return (
                  <Fragment key={policy.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Expand button */}
                      <td className="px-3 py-3">
                        {policyLocations.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(policy.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </td>

                      {/* Policy Number */}
                      <td className="px-3 py-3">
                        <span className="font-medium text-[#006B7D]">
                          {policy.policy_number}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {policy.policy_type || '-'}
                      </td>

                      {/* Carrier */}
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {policy.carrier || '-'}
                      </td>

                      {/* Effective Date */}
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {formatDate(policy.effective_date)}
                      </td>

                      {/* Expiration Date */}
                      <td className="px-3 py-3 text-sm">
                        <span className={`${isExpired(policy.expiration_date) ? 'text-red-600 font-medium' : isExpiringSoon(policy.expiration_date) ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>
                          {formatDate(policy.expiration_date)}
                          {isExpiringSoon(policy.expiration_date) && !isExpired(policy.expiration_date) && (
                            <span className="ml-1 text-xs">(Soon)</span>
                          )}
                        </span>
                      </td>

                      {/* Premium */}
                      <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(policy.premium)}
                      </td>

                      {/* Locations count */}
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {policyLocations.length}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <StatusBadge status={policy.status} />
                      </td>
                    </tr>

                    {/* Expanded locations */}
                    {isExpanded && policyLocations.length > 0 && (
                      <tr key={`${policy.id}-locations`}>
                        <td colSpan={9} className="bg-gray-50 px-6 py-4">
                          <div className="ml-6">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                              Covered Locations ({policyLocations.length})
                            </h4>
                            <div className="space-y-2">
                              {policyLocations.map((pl) => (
                                <Link
                                  key={pl.id}
                                  href={`/clients/${clientId}/locations/${pl.location?.id || pl.location_id}`}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-[#006B7D]/30 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div>
                                      <p className="font-medium text-gray-900 text-sm">
                                        {pl.location?.location_name || 'Unknown Location'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {[pl.location?.city, pl.location?.state].filter(Boolean).join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                  {policy.policy_type === 'General Liability' ? (
                                    <div className="flex items-center gap-6 text-right">
                                      {pl.location?.num_units && (
                                        <div>
                                          <p className="text-xs text-gray-500">Units</p>
                                          <p className="font-medium text-sm text-gray-900">{pl.location.num_units.toLocaleString()}</p>
                                        </div>
                                      )}
                                      {pl.location?.square_footage && (
                                        <div>
                                          <p className="text-xs text-gray-500">Sq Ft</p>
                                          <p className="font-medium text-sm text-gray-900">{pl.location.square_footage.toLocaleString()}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    pl.location_tiv && (
                                      <div className="text-right">
                                        <p className="text-xs text-gray-500">TIV</p>
                                        <p className="font-medium text-sm text-gray-900">{formatCurrency(pl.location_tiv)}</p>
                                      </div>
                                    )
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
