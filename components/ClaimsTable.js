'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const styles = {
    OPEN: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-700',
    DENIED: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

export default function ClaimsTable({ claims, clientId, onAddClaim }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'report_date', direction: 'desc' })
  const [statusFilter, setStatusFilter] = useState('All')

  // Filter and sort claims
  const filteredClaims = useMemo(() => {
    let result = [...claims]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(claim =>
        claim.claim_number?.toLowerCase().includes(query) ||
        claim.claimant?.toLowerCase().includes(query) ||
        claim.property_name?.toLowerCase().includes(query) ||
        claim.loss_description?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(claim => claim.status === statusFilter)
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
  }, [claims, searchQuery, statusFilter, sortConfig])

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
    return (
      <span className="text-[#006B7D] ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/clients/${clientId}/claims/add`)}
            className="bg-[#006B7D] hover:bg-[#008BA3] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Claim
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="PENDING">Pending</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search claims..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
          />
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  onClick={() => handleSort('property_name')}
                >
                  Property <SortIcon column="property_name" />
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
                  className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_incurred')}
                >
                  Total Incurred <SortIcon column="total_incurred" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('report_date')}
                >
                  Report Date <SortIcon column="report_date" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    {claims.length === 0 ? (
                      <div>
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-medium">No claims for this client</p>
                        <p className="text-sm mt-1">Click "Add Claim" to create one</p>
                      </div>
                    ) : (
                      <p>No claims match your search</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredClaims.map(claim => (
                  <tr
                    key={claim.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/claims/${claim.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[#006B7D] hover:underline font-medium">
                        {claim.claim_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{claim.claimant || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{claim.coverage || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{claim.property_name || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(claim.loss_date)}</td>
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

        {/* Summary Footer */}
        {filteredClaims.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between text-sm">
            <span className="text-gray-600">
              {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}
              {statusFilter !== 'All' && ` (${statusFilter.toLowerCase()})`}
            </span>
            <span className="font-medium text-gray-900">
              Total Incurred: {formatCurrency(filteredClaims.reduce((sum, c) => sum + (c.total_incurred || 0), 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
