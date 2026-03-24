'use client'

import { useState, useMemo } from 'react'

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
    O: { label: 'Open', className: 'bg-red-100 text-red-700' },
    C: { label: 'Closed', className: 'bg-green-100 text-green-700' },
    R: { label: 'Reopened', className: 'bg-amber-100 text-amber-700' },
  }
  const config = styles[s] || { label: s || 'Unknown', className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

export default function OrigamiIncidentsTable({ incidents }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'loss_date', direction: 'desc' })
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredIncidents = useMemo(() => {
    let result = [...incidents]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(inc =>
        inc.incident_number?.toString().toLowerCase().includes(query) ||
        inc.claimant?.toLowerCase().includes(query) ||
        inc.loss_description?.toLowerCase().includes(query) ||
        inc.event_description?.toLowerCase().includes(query) ||
        inc.location_name?.toLowerCase().includes(query) ||
        inc.accident_city?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'All') {
      result = result.filter(inc => inc.status === statusFilter)
    }

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
  }, [incidents, searchQuery, statusFilter, sortConfig])

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
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="O">Open</option>
            <option value="C">Closed</option>
            <option value="R">Reopened</option>
          </select>
        </div>

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
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('incident_number')}
                >
                  Incident # <SortIcon column="incident_number" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('claimant')}
                >
                  Claimant <SortIcon column="claimant" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('loss_date')}
                >
                  Loss Date <SortIcon column="loss_date" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('report_date')}
                >
                  Report Date <SortIcon column="report_date" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon column="status" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('location_name')}
                >
                  Location <SortIcon column="location_name" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {incidents.length === 0 ? (
                      <div>
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="font-medium">No incidents for this client</p>
                      </div>
                    ) : (
                      <p>No incidents match your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map(inc => (
                  <tr
                    key={inc.incident_id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[#006B7D] font-medium">
                        {inc.incident_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{inc.claimant || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(inc.loss_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(inc.report_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inc.status} /></td>
                    <td className="px-4 py-3 text-gray-600">
                      {inc.location_name || inc.accident_city || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <div className="line-clamp-2" title={inc.loss_description || inc.event_description}>
                        {inc.loss_description || inc.event_description || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredIncidents.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
            {statusFilter !== 'All' && ` (${statusFilter === 'O' ? 'Open' : statusFilter === 'C' ? 'Closed' : 'Reopened'})`}
          </div>
        )}
      </div>
    </div>
  )
}
