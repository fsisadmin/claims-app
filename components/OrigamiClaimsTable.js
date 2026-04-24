'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
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

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase()
  const styles = {
    OPEN: 'bg-red-100 text-red-700',
    O: 'bg-red-100 text-red-700',
    CLOSED: 'bg-green-100 text-green-700',
    C: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    R: 'bg-amber-100 text-amber-700',
    DENIED: 'bg-gray-100 text-gray-700',
  }
  const labels = { O: 'OPEN', C: 'CLOSED', R: 'REOPENED' }
  const label = labels[s] || s || 'UNKNOWN'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[s] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  )
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function OrigamiClaimsTable({ claims = [], onNewClaim }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'loss_date', direction: 'desc' })
  const [statusFilter, setStatusFilter] = useState('All')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredClaims = useMemo(() => {
    let result = [...claims]

    if (statusFilter !== 'All') {
      result = result.filter(c => {
        const s = (c.status || '').toUpperCase()
        if (statusFilter === 'OPEN') return s === 'OPEN' || s === 'O'
        if (statusFilter === 'CLOSED') return s === 'CLOSED' || s === 'C'
        if (statusFilter === 'PENDING') return s === 'PENDING' || s === 'R'
        return s === statusFilter
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        (c.claim_number || '').toLowerCase().includes(q) ||
        (c.claimant || '').toLowerCase().includes(q) ||
        (c.loss_description || '').toLowerCase().includes(q) ||
        (c.tpa_claim_number || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (['total_paid', 'total_reserved', 'total_incurred', 'total_recovery'].includes(sortConfig.key)) {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
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
  }, [claims, searchQuery, statusFilter, sortConfig])

  const totalPages = Math.ceil(filteredClaims.length / pageSize)
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredClaims.slice(start, start + pageSize)
  }, [filteredClaims, currentPage, pageSize])

  const handleSearchChange = (value) => { setSearchQuery(value); setCurrentPage(1) }
  const handleStatusChange = (value) => { setStatusFilter(value); setCurrentPage(1) }
  const handlePageSizeChange = (value) => { setPageSize(Number(value)); setCurrentPage(1) }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

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
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="PENDING">Pending</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-700"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
        </div>

        {/* Search + New Claim */}
        <div className="flex items-center gap-3">
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
            />
          </div>
          {onNewClaim && (
            <button
              onClick={onNewClaim}
              className="px-4 py-2 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Claim
            </button>
          )}
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('claim_number')}>
                  Claim # <SortIcon column="claim_number" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('claimant')}>
                  Claimant <SortIcon column="claimant" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('location_name')}>
                  Property <SortIcon column="location_name" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('coverage_type')}>
                  Coverage <SortIcon column="coverage_type" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('loss_date')}>
                  Loss Date <SortIcon column="loss_date" />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_paid')}>
                  Total Paid <SortIcon column="total_paid" />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_reserved')}>
                  Total Reserved <SortIcon column="total_reserved" />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total_incurred')}>
                  Total Incurred <SortIcon column="total_incurred" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('report_date')}>
                  Report Date <SortIcon column="report_date" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedClaims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    {claims.length === 0 ? (
                      <div>
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-medium">No claims for this client</p>
                      </div>
                    ) : (
                      <p>No claims match your search</p>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedClaims.map(c => (
                  <tr
                    key={c.claim_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/origami/claims/${c.claim_id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[#006B7D] hover:underline font-medium">
                        {c.claim_number || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{c.claimant || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.location_name || '—'}</td>
                    <td className="px-4 py-3">
                      {c.coverage_type ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          c.coverage_type === 'GL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {c.coverage_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.loss_date)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(c.total_paid)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(c.total_reserved)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(c.total_incurred)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.report_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination */}
        {filteredClaims.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}
              {statusFilter !== 'All' && ` (${statusFilter.toLowerCase()})`}
              {' · '}
              <span className="font-medium text-gray-900">
                Total Incurred: {formatCurrency(filteredClaims.reduce((sum, c) => sum + (Number(c.total_incurred) || 0), 0))}
              </span>
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Prev
                </button>
                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
