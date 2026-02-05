'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import CommentSidebar from '@/components/CommentSidebar'
import TasksSection from '@/components/TasksSection'
import { supabase } from '@/lib/supabase'
import { useLocation, useClient } from '@/hooks'

export default function LocationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('lenders')
  const [claims, setClaims] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const sovScrollRef = useRef(null)
  const [focusedSovCell, setFocusedSovCell] = useState(null) // Which cell is focused (for navigation)
  const [editingSovCell, setEditingSovCell] = useState(null) // Which cell is being edited

  // Use SWR hooks for cached data fetching
  const { location, isLoading: locationLoading, mutate: mutateLocation } = useLocation(params.locationId, profile?.organization_id)
  const { client } = useClient(params.id, profile?.organization_id)

  // Sync editData with location when location changes
  useEffect(() => {
    if (location) {
      setEditData(location)
    }
  }, [location])

  // Fetch claims for this location
  useEffect(() => {
    async function fetchClaims() {
      if (!params.locationId || !profile?.organization_id) return

      setClaimsLoading(true)
      try {
        const { data, error } = await supabase
          .from('claims')
          .select('*')
          .eq('location_id', params.locationId)
          .eq('organization_id', profile.organization_id)
          .order('loss_date', { ascending: false })
          .limit(100)

        if (error) throw error
        setClaims(data || [])
      } catch (error) {
        console.error('Error fetching claims:', error)
      } finally {
        setClaimsLoading(false)
      }
    }

    fetchClaims()
  }, [params.locationId, profile?.organization_id])

  // Fetch users for task assignment dropdown
  useEffect(() => {
    async function fetchUsers() {
      if (!profile?.organization_id) return
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name')
      setUsers(data || [])
    }
    fetchUsers()
  }, [profile?.organization_id])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Auto-scroll to keep focused SOV cell visible
  useEffect(() => {
    if (focusedSovCell === null) return

    const cellElement = document.querySelector(`[data-sov-cell="${focusedSovCell}"]`)
    if (cellElement && sovScrollRef.current) {
      const container = sovScrollRef.current
      const cellRect = cellElement.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Horizontal scroll
      if (cellRect.left < containerRect.left) {
        const scrollAmount = cellRect.left - containerRect.left - 10
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      } else if (cellRect.right > containerRect.right) {
        const scrollAmount = cellRect.right - containerRect.right + 10
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      }
    }
  }, [focusedSovCell])

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editingSovCell !== null) {
      const input = document.querySelector(`[data-sov-input="${editingSovCell}"]`)
      if (input) {
        input.focus()
        input.select()
      }
    }
  }, [editingSovCell])

  async function handleSave() {
    setSaving(true)
    try {
      // Security: Include organization_id in the update query
      const { error } = await supabase
        .from('locations')
        .update(editData)
        .eq('id', params.locationId)
        .eq('organization_id', profile.organization_id)

      if (error) throw error
      // Update the SWR cache with new data
      mutateLocation(editData, false)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function handleInputChange(field, value) {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  // Risk assessment color coding
  function getRiskColor(risk) {
    if (!risk) return 'text-gray-500'
    const lower = risk.toLowerCase()
    if (lower.includes('very low') || lower === 'no') return 'text-green-600'
    if (lower.includes('relatively low') || lower.includes('low')) return 'text-green-500'
    if (lower.includes('moderate')) return 'text-yellow-600'
    if (lower.includes('relatively high')) return 'text-orange-500'
    if (lower.includes('high') || lower.includes('very high') || lower === 'yes') return 'text-red-600'
    return 'text-gray-700'
  }

  if (authLoading || !profile || locationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading location...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-600 font-medium">Location not found</p>
          </div>
        </main>
      </div>
    )
  }

  // SOV Single Line columns - location_name is frozen, rest are scrollable
  const sovColumns = [
    { key: 'entity_name', label: 'Entity Name', width: 150 },
    { key: 'street_address', label: 'Street Address', width: 180 },
    { key: 'city', label: 'City', width: 120 },
    { key: 'state', label: 'State', width: 80 },
    { key: 'zip', label: 'Zip', width: 80 },
    { key: 'county', label: 'County', width: 120 },
    { key: 'num_buildings', label: '# Bldgs', width: 80 },
    { key: 'num_units', label: '# Units', width: 80 },
    { key: 'square_footage', label: 'Sq Ft', width: 100 },
    { key: 'construction_description', label: 'Construction', width: 150 },
    { key: 'orig_year_built', label: 'Year Built', width: 100 },
    { key: 'real_property_value', label: 'Real Property $', width: 130 },
    { key: 'personal_property_value', label: 'Personal Property $', width: 140 },
    { key: 'total_tiv', label: 'Total TIV', width: 120 },
  ]

  // Handle SOV cell click - focus the cell
  const handleSovCellClick = (colIndex) => {
    setFocusedSovCell(colIndex)
  }

  // Handle SOV cell double click - enter edit mode
  const handleSovCellDoubleClick = (colIndex) => {
    setFocusedSovCell(colIndex)
    setEditingSovCell(colIndex)
  }

  // Handle keyboard navigation in SOV table
  const handleSovTableKeyDown = (e) => {
    // If we're editing, let the input handle most keys
    if (editingSovCell !== null) {
      if (e.key === 'Escape') {
        // Cancel editing
        setEditData(location) // Reset to original
        setEditingSovCell(null)
      } else if (e.key === 'Enter') {
        // Save and exit edit mode
        handleSave()
        setEditingSovCell(null)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        // Save current cell and move to next/previous
        const nextCol = e.shiftKey
          ? Math.max(-1, focusedSovCell - 1) // -1 for frozen column
          : Math.min(sovColumns.length - 1, focusedSovCell + 1)
        setEditingSovCell(null)
        setFocusedSovCell(nextCol)
        // Auto-start editing in next cell
        setTimeout(() => setEditingSovCell(nextCol), 50)
      }
      return
    }

    // Navigation when not editing
    if (focusedSovCell === null) return

    let newCol = focusedSovCell

    switch (e.key) {
      case 'ArrowLeft':
        newCol = Math.max(-1, focusedSovCell - 1) // -1 for frozen column
        e.preventDefault()
        break
      case 'ArrowRight':
        newCol = Math.min(sovColumns.length - 1, focusedSovCell + 1)
        e.preventDefault()
        break
      case 'Tab':
        e.preventDefault()
        newCol = e.shiftKey
          ? Math.max(-1, focusedSovCell - 1)
          : Math.min(sovColumns.length - 1, focusedSovCell + 1)
        break
      case 'Enter':
        // Enter edit mode
        setEditingSovCell(focusedSovCell)
        e.preventDefault()
        return
      default:
        // If user types a character, start editing
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setEditingSovCell(focusedSovCell)
          // Let the character be typed into the input
        }
        return
    }

    if (newCol !== focusedSovCell) {
      setFocusedSovCell(newCol)
    }
  }

  // Handle input blur in SOV cell
  const handleSovInputBlur = () => {
    setEditingSovCell(null)
  }

  // Handle input keydown in SOV cell
  const handleSovInputKeyDown = (e, colIndex) => {
    if (e.key === 'Escape') {
      setEditData(location)
      setEditingSovCell(null)
    } else if (e.key === 'Enter') {
      handleSave()
      setEditingSovCell(null)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const nextCol = e.shiftKey
        ? Math.max(-1, colIndex - 1)
        : Math.min(sovColumns.length - 1, colIndex + 1)
      setEditingSovCell(null)
      setFocusedSovCell(nextCol)
      setTimeout(() => setEditingSovCell(nextCol), 50)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      {/* Comment Sidebar */}
      <CommentSidebar
        entityType="location"
        entityId={params.locationId}
        organizationId={profile.organization_id}
        entityName={location.location_name || location.company || 'Location'}
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/clients/${params.id}`)}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {client?.name || 'Client'}
          </button>
        </div>

        {/* Location Details Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#006B7D] mb-4">Location Details</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={editData.location_name || ''}
                    onChange={(e) => handleInputChange('location_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Name</label>
                  <input
                    type="text"
                    value={editData.entity_name || ''}
                    onChange={(e) => handleInputChange('entity_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={editData.street_address || ''}
                    onChange={(e) => handleInputChange('street_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={editData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                    <input
                      type="text"
                      value={editData.zip || ''}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditData(location) }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{location.location_name || location.street_address}</h2>
                  {location.entity_name && (
                    <p className="text-gray-600">{location.entity_name}</p>
                  )}
                  <p className="text-gray-600">{location.street_address}</p>
                  <p className="text-gray-600">
                    {[location.city, location.state, location.zip].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Location Risk Assessment */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#006B7D] mb-4">Location Risk Assessment</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 w-48">Tier 1 Wind</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getRiskColor(location.tier_1_wind)}`}>
                    {location.tier_1_wind || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600">Coastal Flooding</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getRiskColor(location.coastal_flooding_risk)}`}>
                    {location.coastal_flooding_risk || location.coastal_flooding || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600">Wildfire</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getRiskColor(location.wildfire_risk)}`}>
                    {location.wildfire_risk || location.wildfire || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600">Earthquake</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getRiskColor(location.earthquake_risk)}`}>
                    {location.earthquake_risk || location.earthquake || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600">Tornado</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getRiskColor(location.tornado_risk)}`}>
                    {location.tornado_risk || location.tornado || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600">Flood Zone</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getRiskColor(location.flood_zone)}`}>
                    {location.flood_zone || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SOV Single Line */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#006B7D] mb-1">SOV Single Line</h2>
              <p className="text-sm text-gray-500">Click to select, double-click or type to edit</p>
            </div>
            {editingSovCell !== null && (
              <div className="flex gap-2">
                <button
                  onClick={() => { handleSave(); setEditingSovCell(null); }}
                  disabled={saving}
                  className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingSovCell(null); setEditData(location); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden focus:outline-none"
            tabIndex={0}
            onKeyDown={handleSovTableKeyDown}
          >
            <div className="flex">
              {/* Frozen Location Name Column */}
              <div className="flex-shrink-0 bg-white border-r-2 border-gray-300 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <table>
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                        style={{ minWidth: 180 }}
                      >
                        Location Name
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        data-sov-cell="-1"
                        onClick={() => handleSovCellClick(-1)}
                        onDoubleClick={() => handleSovCellDoubleClick(-1)}
                        className={`px-0 py-0 text-sm whitespace-nowrap cursor-cell
                          ${focusedSovCell === -1 ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}
                        `}
                        style={{ minWidth: 180 }}
                      >
                        {editingSovCell === -1 ? (
                          <input
                            type="text"
                            data-sov-input="-1"
                            value={editData.location_name || ''}
                            onChange={(e) => handleInputChange('location_name', e.target.value)}
                            onBlur={handleSovInputBlur}
                            onKeyDown={(e) => handleSovInputKeyDown(e, -1)}
                            className="w-full h-full px-4 py-3 border-2 border-blue-500 outline-none bg-white text-gray-900 text-sm font-medium"
                            style={{ minWidth: 170 }}
                          />
                        ) : (
                          <div className="px-4 py-3 font-medium text-gray-900">
                            {location.location_name || <span className="text-gray-400">-</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Scrollable Columns */}
              <div
                ref={sovScrollRef}
                className="overflow-x-auto flex-1"
              >
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {sovColumns.map(col => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                          style={{ minWidth: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {sovColumns.map((col, colIndex) => (
                        <td
                          key={col.key}
                          data-sov-cell={colIndex}
                          onClick={() => handleSovCellClick(colIndex)}
                          onDoubleClick={() => handleSovCellDoubleClick(colIndex)}
                          className={`px-0 py-0 text-sm text-gray-900 whitespace-nowrap border-r border-gray-100 last:border-r-0 cursor-cell
                            ${focusedSovCell === colIndex ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : 'hover:bg-gray-50'}
                          `}
                          style={{ minWidth: col.width, maxWidth: col.width }}
                        >
                          {editingSovCell === colIndex ? (
                            <input
                              type={col.key.includes('value') || col.key === 'total_tiv' || col.key === 'num_buildings' || col.key === 'num_units' || col.key === 'square_footage' || col.key === 'orig_year_built' ? 'number' : 'text'}
                              data-sov-input={colIndex}
                              value={editData[col.key] || ''}
                              onChange={(e) => handleInputChange(col.key, e.target.value)}
                              onBlur={handleSovInputBlur}
                              onKeyDown={(e) => handleSovInputKeyDown(e, colIndex)}
                              className="w-full h-full px-4 py-3 border-2 border-blue-500 outline-none bg-white text-gray-900 text-sm"
                              style={{ minWidth: col.width - 4 }}
                            />
                          ) : (
                            <div className="px-4 py-3 truncate" title={
                              col.key.includes('value') || col.key === 'total_tiv'
                                ? location[col.key] ? `$${Number(location[col.key]).toLocaleString()}` : '-'
                                : location[col.key] || '-'
                            }>
                              {col.key.includes('value') || col.key === 'total_tiv'
                                ? location[col.key]
                                  ? `$${Number(location[col.key]).toLocaleString()}`
                                  : <span className="text-gray-400">-</span>
                                : location[col.key] || <span className="text-gray-400">-</span>
                              }
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Click to select • Double-click or Enter to edit • Arrow keys to navigate • Tab to move between cells • Esc to cancel
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <TasksSection
          clientId={params.id}
          clientName={client?.name}
          linkedEntityType="location"
          linkedEntityId={params.locationId}
          linkedEntityName={location.location_name || location.street_address}
          organizationId={profile.organization_id}
          userId={user.id}
          users={users}
        />

        {/* Tabs Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tab Headers */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('lenders')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'lenders'
                      ? 'border-[#006B7D] text-[#006B7D]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Lender Info
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('claims')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'claims'
                      ? 'border-[#006B7D] text-[#006B7D]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Claims
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('policies')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'policies'
                      ? 'border-[#006B7D] text-[#006B7D]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Policies
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Lender Info Tab */}
              {activeTab === 'lenders' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Lender Information</h3>
                    <button className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors">
                      Add Lender
                    </button>
                  </div>

                  {/* Lender Details */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Lenders</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.lenders || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Lender Name Rollup</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.lender_name_rollup || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Recipients */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-semibold text-gray-900">Certificate Recipients</h4>
                      <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                        Add Recipient
                      </button>
                    </div>
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm">No certificate recipients found.</p>
                    </div>
                  </div>

                  {/* EPI Info */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">EPI Certificate Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">EPI Certificate</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.epi_certificate || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">EPI Certificate To Use</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.epi_certificate_to_use_name || location.epi_certificate_to_use || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">EPI Additional Remarks</label>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 min-h-[60px]">
                        {location.location_epi_additional_remarks || 'No remarks'}
                      </div>
                    </div>
                  </div>

                  {/* COI Info */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">COI Certificate Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">COI Certificate</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.coi_certificate || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">COI Certificate To Use</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.coi_certificate_to_use || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">COI Additional Remarks</label>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 min-h-[60px]">
                        {location.coi_location_specific_additional_remarks || 'No remarks'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Claims Tab */}
              {activeTab === 'claims' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Claims History</h3>
                    <button
                      onClick={() => router.push(`/clients/${params.id}/claims/add?location=${params.locationId}`)}
                      className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Add Claim
                    </button>
                  </div>

                  {/* Claims Summary - calculated from actual claims */}
                  {(() => {
                    const openClaims = claims.filter(c => c.status?.toUpperCase() === 'OPEN')
                    const totalOpenValue = openClaims.reduce((sum, c) => sum + (Number(c.total_incurred) || 0), 0)
                    const fiveYearsAgo = new Date()
                    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
                    const recentClaims = claims.filter(c => new Date(c.loss_date) >= fiveYearsAgo)
                    const propTotal = recentClaims.filter(c => c.claim_type?.toLowerCase().includes('prop') || c.coverage?.toLowerCase().includes('prop')).reduce((sum, c) => sum + (Number(c.total_incurred) || 0), 0)
                    const glTotal = recentClaims.filter(c => c.claim_type?.toLowerCase().includes('liability') || c.coverage?.toLowerCase().includes('liability')).reduce((sum, c) => sum + (Number(c.total_incurred) || 0), 0)

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Open Claims</p>
                            <p className="text-2xl font-bold text-gray-900">{openClaims.length}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Total Open Claims Value</p>
                            <p className="text-2xl font-bold text-gray-900">
                              ${totalOpenValue.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Loss Run Summary</p>
                            <p className="text-sm font-medium text-gray-900">{location.loss_run_summary || '-'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-blue-100 rounded-lg p-4 border border-blue-200">
                            <p className="text-sm font-medium text-blue-800 mb-1">Total Incurred (5 Years) - Property</p>
                            <p className="text-2xl font-bold text-blue-900">
                              ${propTotal.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-emerald-100 rounded-lg p-4 border border-emerald-200">
                            <p className="text-sm font-medium text-emerald-800 mb-1">Total Incurred (5 Years) - GL</p>
                            <p className="text-2xl font-bold text-emerald-900">
                              ${glTotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </>
                    )
                  })()}

                  {/* Claims List */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Claims List</h4>
                    {claimsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                        <p className="mt-2 text-gray-600">Loading claims...</p>
                      </div>
                    ) : claims.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Claim #</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date of Loss</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Incurred</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {claims.map(claim => (
                              <tr
                                key={claim.id}
                                onClick={() => router.push(`/claims/${claim.id}`)}
                                className="hover:bg-gray-50 cursor-pointer"
                              >
                                <td className="px-4 py-3 text-sm font-medium text-[#006B7D]">
                                  {claim.claim_number || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {claim.loss_date ? new Date(claim.loss_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {claim.claim_type || claim.coverage || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    claim.status?.toUpperCase() === 'OPEN'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {claim.status || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {claim.total_incurred ? `$${Number(claim.total_incurred).toLocaleString()}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                  {claim.loss_description || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">No claims found for this location.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Policies Tab */}
              {activeTab === 'policies' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Policy Information</h3>
                    <button className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg text-sm font-medium transition-colors">
                      Add Policy
                    </button>
                  </div>

                  {/* Policy Details */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Policy</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.policy || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Policy ID</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.policy_id || '-'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Policies (All)</label>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                        {location.policies || '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">25-26 Policies</label>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                        {location.policies_25_26 || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Coverage */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Coverage Details</h4>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {location.coverage || 'No coverage details available'}
                      </div>
                    </div>
                  </div>

                  {/* Deductibles */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Deductibles</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Deductible</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.deductible || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">NWS Deductible</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.nws_deductible || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Wind/Hail Deductible</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.wind_hail_deductible || '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Self Insured Retention</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                          {location.self_insured_retention || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Documents</h4>
                    {location.documents_for_location ? (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                        {location.documents_for_location}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">No documents found for this location.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
