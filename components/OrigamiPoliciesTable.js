'use client'

import { useState, useMemo } from 'react'
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
  if (!dateString) return ''
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[s] || 'bg-gray-100 text-gray-700'}`}>
      {status || 'Unknown'}
    </span>
  )
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function OrigamiPoliciesTable({ policies = [] }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('expiration_date')
  const [sortDir, setSortDir] = useState('desc')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const availableYears = useMemo(() => {
    const years = new Set()
    policies.forEach(p => {
      if (p.effective_date) years.add(new Date(p.effective_date).getFullYear())
      if (p.expiration_date) years.add(new Date(p.expiration_date).getFullYear())
    })
    return [...years].sort((a, b) => b - a)
  }, [policies])

  const filteredPolicies = useMemo(() => {
    let result = [...policies]

    if (yearFilter !== 'ALL') {
      const y = Number(yearFilter)
      result = result.filter(p => {
        const eff = p.effective_date ? new Date(p.effective_date).getFullYear() : null
        const exp = p.expiration_date ? new Date(p.expiration_date).getFullYear() : null
        if (eff !== null && exp !== null) return eff <= y && exp >= y
        if (eff !== null) return eff === y
        if (exp !== null) return exp === y
        return false
      })
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        (p.policy_number || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.carrier_name || '').toLowerCase().includes(q) ||
        (p.line_of_business || '').toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (sortField === 'premium') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      }
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [policies, search, sortField, sortDir, yearFilter])

  // Pagination
  const totalPages = Math.ceil(filteredPolicies.length / pageSize)
  const paginatedPolicies = filteredPolicies.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize))
    setCurrentPage(1)
  }

  const handleSearchChange = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleYearChange = (value) => {
    setYearFilter(value)
    setCurrentPage(1)
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false
    const exp = new Date(dateStr)
    const now = new Date()
    const diff = (exp - now) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  }

  const isExpired = (dateStr) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  const totalPremium = filteredPolicies.reduce((sum, p) => sum + (Number(p.premium) || 0), 0)

  return (
    <div>
      {/* Summary Bar */}
      <div className="flex items-center gap-6 mb-4 p-3 bg-[#006B7D]/5 rounded-lg border border-[#006B7D]/20">
        <div className="text-xs font-semibold text-[#006B7D] uppercase tracking-wide">Policies</div>
        <div className="text-sm text-gray-700">
          <span className="font-semibold">{filteredPolicies.length}</span>{yearFilter !== 'ALL' ? ` of ${policies.length}` : ''} total
        </div>
        <div className="text-sm text-gray-700">Total Premium: <span className="font-semibold">{formatCurrency(totalPremium)}</span></div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={e => handleYearChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="ALL">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
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
              placeholder="Search policies..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('policy_number')}>
                  Policy # <SortIcon field="policy_number" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('description')}>
                  Description <SortIcon field="description" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('carrier_name')}>
                  Carrier <SortIcon field="carrier_name" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('line_of_business')}>
                  Coverage <SortIcon field="line_of_business" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('effective_date')}>
                  Effective <SortIcon field="effective_date" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('expiration_date')}>
                  Expiration <SortIcon field="expiration_date" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('premium')}>
                  Premium <SortIcon field="premium" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                  Locations
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedPolicies.map(p => {
                const locCount = (p.location_values || []).length
                return (
                  <tr key={p.polid || p.policy_id || `pol-${p.policy_number}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/origami/policies/${p.policy_id}`}
                        className="font-medium text-[#006B7D] hover:underline text-sm"
                      >
                        {p.policy_number || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 max-w-xs truncate" title={p.description}>{p.description || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 max-w-[180px] truncate" title={p.carrier_name}>{p.carrier_name || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 max-w-[140px] truncate" title={p.line_of_business}>{p.line_of_business || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{formatDate(p.effective_date)}</td>
                    <td className="px-4 py-2.5 text-sm">
                      <span className={
                        isExpired(p.expiration_date) ? 'text-red-600 font-bold' :
                        isExpiringSoon(p.expiration_date) ? 'text-amber-600 font-bold' :
                        'text-gray-900'
                      }>
                        {formatDate(p.expiration_date)}
                        {isExpiringSoon(p.expiration_date) && !isExpired(p.expiration_date) && (
                          <span className="ml-1 text-xs text-amber-500">(Soon)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-mono">{formatCurrency(p.premium)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
                        {locCount}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                )
              })}
              {paginatedPolicies.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No policies found{search ? ` matching "${search}"` : ''}{yearFilter !== 'ALL' ? ` for ${yearFilter}` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredPolicies.length)} of {filteredPolicies.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-700"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page
                if (totalPages <= 5) {
                  page = i + 1
                } else if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm border rounded-lg ${
                      currentPage === page
                        ? 'bg-[#006B7D] text-white border-[#006B7D]'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
