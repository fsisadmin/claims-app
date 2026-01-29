'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

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
    CLOSED: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-amber-100 text-amber-700',
    UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  }
  const labels = {
    OPEN: 'Open',
    CLOSED: 'Closed',
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function IncidentsTable({ incidents, clientId }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'incident_number', direction: 'desc' })
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Get unique incident types
  const incidentTypes = useMemo(() => {
    const types = new Set(incidents.map(i => i.incident_type).filter(Boolean))
    return Array.from(types).sort()
  }, [incidents])

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    let result = [...incidents]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(incident =>
        incident.incident_number?.toString().includes(query) ||
        incident.incident_details?.toLowerCase().includes(query) ||
        incident.event_description?.toLowerCase().includes(query) ||
        incident.property_name?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (typeFilter !== 'All') {
      result = result.filter(incident => incident.incident_type === typeFilter)
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(incident => incident.status === statusFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      // Handle nested location
      if (sortConfig.key === 'location_name') {
        aVal = a.locations?.location_name || a.locations?.company
        bVal = b.locations?.location_name || b.locations?.company
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
  }, [incidents, searchQuery, typeFilter, statusFilter, sortConfig])

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
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/clients/${clientId}/incidents/add`)}
            className="bg-[#006B7D] hover:bg-[#008BA3] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Incident
          </button>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-700"
          >
            <option value="All">All Types</option>
            {incidentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

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
            <option value="UNDER_REVIEW">Under Review</option>
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
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
          />
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 w-16"
                  onClick={() => handleSort('incident_number')}
                >
                  # <SortIcon column="incident_number" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('incident_details')}
                >
                  Incident Details <SortIcon column="incident_details" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('incident_type')}
                >
                  Incident Type <SortIcon column="incident_type" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('location_name')}
                >
                  Location <SortIcon column="location_name" />
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('loss_date')}
                >
                  Loss Date <SortIcon column="loss_date" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Event Description
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('property_name')}
                >
                  Property Name <SortIcon column="property_name" />
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('incident_only')}
                >
                  Incident Only <SortIcon column="incident_only" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    {incidents.length === 0 ? (
                      <div>
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="font-medium">No incidents for this client</p>
                        <p className="text-sm mt-1">Click "New Incident" to report one</p>
                      </div>
                    ) : (
                      <p>No incidents match your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map(incident => (
                  <tr
                    key={incident.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/incidents/${incident.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[#006B7D] hover:underline font-medium">
                        {incident.incident_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs">
                      <div className="line-clamp-2">{incident.incident_details || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{incident.incident_type || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {incident.locations?.location_name || incident.locations?.company || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(incident.loss_date)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <div className="line-clamp-2" title={incident.event_description}>
                        {incident.event_description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{incident.property_name || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {incident.incident_only ? (
                        <svg className="w-5 h-5 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {filteredIncidents.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
            {typeFilter !== 'All' && ` (${typeFilter})`}
          </div>
        )}
      </div>
    </div>
  )
}
