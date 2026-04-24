'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import CommentSidebar from '@/components/CommentSidebar'
import TasksSection from '@/components/TasksSection'
import { supabase } from '@/lib/supabase'
import { US_STATES } from '@/lib/constants'
import { useLocation, useClient } from '@/hooks'
import OrigamiClaimsTable from '@/components/OrigamiClaimsTable'
import OrigamiPoliciesTable from '@/components/OrigamiPoliciesTable'

export default function LocationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('claims')
  const [claims, setClaims] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [linkedPolicies, setLinkedPolicies] = useState([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [users, setUsers] = useState([])
  const sovScrollRef = useRef(null)
  const [focusedSovCell, setFocusedSovCell] = useState(null) // Which cell is focused (for navigation)
  const [editingSovCell, setEditingSovCell] = useState(null) // Which cell is being edited
  const [sovUndoStack, setSovUndoStack] = useState([]) // Undo stack for SOV changes
  const [origamiClaims, setOrigamiClaims] = useState([])
  const [origamiPolicies, setOrigamiPolicies] = useState([])
  const [origamiIncidents, setOrigamiIncidents] = useState([])
  const [origamiLoading, setOrigamiLoading] = useState(false)
  const [origamiFetched, setOrigamiFetched] = useState(false)
  const [hasOrigamiData, setHasOrigamiData] = useState(false)
  const [origamiLocationIds, setOrigamiLocationIds] = useState([])
  const [exporting, setExporting] = useState(false)

  // Use SWR hooks for cached data fetching
  const { location, isLoading: locationLoading, mutate: mutateLocation } = useLocation(params.locationId, profile?.organization_id)
  const { client } = useClient(params.id, profile?.organization_id)

  // Sync editData with location when location changes
  useEffect(() => {
    if (location) {
      setEditData(location)
    }
  }, [location])

  // Check if this location has origami data + fetch when tab clicked
  useEffect(() => {
    async function checkOrigami() {
      if (!params.locationId || !profile?.organization_id) return
      try {
        const res = await fetch('/api/origami/location-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appLocationId: params.locationId, organizationId: profile.organization_id }),
        })
        const data = await res.json()
        setHasOrigamiData(data.hasOrigamiData)
      } catch (e) { /* silent */ }
    }
    checkOrigami()
  }, [params.locationId, profile?.organization_id])

  useEffect(() => {
    async function fetchOrigami() {
      if (!params.locationId || !profile?.organization_id || origamiFetched) return
      if (activeTab !== 'claims' && activeTab !== 'policies') return

      setOrigamiLoading(true)
      try {
        const res = await fetch('/api/origami/location-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appLocationId: params.locationId, organizationId: profile.organization_id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOrigamiClaims(data.claims || [])
        setOrigamiPolicies(data.policies || [])
        setOrigamiIncidents(data.incidents || [])
        setOrigamiLocationIds(data.origamiLocationIds || [])
        setHasOrigamiData(data.hasOrigamiData)
        setOrigamiFetched(true)
      } catch (error) {
        console.error('Error fetching origami data:', error)
      } finally {
        setOrigamiLoading(false)
      }
    }
    fetchOrigami()
  }, [activeTab, params.locationId, profile?.organization_id, origamiFetched])

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

  const handleExportLossLetter = async () => {
    if (!origamiLocationIds.length) return alert('No origami location linked')
    setExporting(true)
    try {
      const res = await fetch('/api/origami/loss-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origamiLocationId: origamiLocationIds[0],
          organizationId: profile.organization_id,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
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
      // Track changes for undo before saving
      if (location && editData) {
        const changes = []
        Object.keys(editData).forEach(key => {
          if (editData[key] !== location[key]) {
            changes.push({ field: key, oldValue: location[key], newValue: editData[key] })
          }
        })
        if (changes.length > 0) {
          setSovUndoStack(prev => [...prev.slice(-49), { changes, previousData: { ...location } }])
        }
      }

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

  // Undo last SOV change
  async function handleSovUndo() {
    if (sovUndoStack.length === 0) return

    const lastAction = sovUndoStack[sovUndoStack.length - 1]
    setSaving(true)

    try {
      const { error } = await supabase
        .from('locations')
        .update(lastAction.previousData)
        .eq('id', params.locationId)
        .eq('organization_id', profile.organization_id)

      if (error) throw error

      // Remove from undo stack
      setSovUndoStack(prev => prev.slice(0, -1))

      // Update local state and SWR cache
      setEditData(lastAction.previousData)
      mutateLocation(lastAction.previousData, false)
    } catch (error) {
      console.error('Error undoing:', error)
      alert('Failed to undo')
    } finally {
      setSaving(false)
    }
  }

  // Copy focused SOV cell value to clipboard
  async function handleSovCopy() {
    if (focusedSovCell === null) return

    let value
    if (focusedSovCell === -1) {
      value = location?.location_name
    } else {
      const col = sovColumns[focusedSovCell]
      value = location?.[col?.key]
    }

    const textValue = value != null ? String(value) : ''
    try {
      await navigator.clipboard.writeText(textValue)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const ISO_CONST_MAP = {
    '1': 'Frame',
    '2': 'Joisted Masonry',
    '3': 'Non-Combustible',
    '4': 'Masonry Non-Combustible',
    '5': 'Modified Fire Resistive',
    '6': 'Fire Resistive',
  }

  function handleInputChange(field, value) {
    setEditData(prev => {
      const updated = { ...prev, [field]: value }
      // Auto-populate construction_description when iso_const changes
      if (field === 'iso_const' && ISO_CONST_MAP[value]) {
        updated.construction_description = ISO_CONST_MAP[value]
      }
      return updated
    })
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
    { key: 'entity_name', label: 'Entity Name', width: 200 },
    { key: 'company', label: 'Company', width: 150 },
    { key: 'street_address', label: 'Street Address', width: 200 },
    { key: 'city', label: 'City', width: 120 },
    { key: 'state', label: 'State', width: 100, type: 'dropdown', options: US_STATES.map(s => s.code) },
    { key: 'zip', label: 'Zip', width: 80 },
    { key: 'county', label: 'County', width: 120 },
    { key: 'is_prop_within_1000ft_saltwater', label: 'Within 1000ft Saltwater', width: 170 },
    { key: 'num_buildings', label: '# of Bldgs', width: 90 },
    { key: 'iso_const', label: 'ISO Const', width: 100, type: 'dropdown', options: ['1','2','3','4','5','6','Combo'] },
    { key: 'construction_description', label: 'Construction Description', width: 200, type: 'dropdown', options: ['Frame','Joisted Masonry','Non-Combustible','Masonry Non-Combustible','Modified Fire Resistive','Fire Resistive','Combo'] },
    { key: 'num_stories', label: '# of Stories', width: 90 },
    { key: 'orig_year_built', label: 'Orig Year Built', width: 120 },
    { key: 'real_property_value', label: 'Real Property Value', width: 150 },
    { key: 'personal_property_value', label: 'Personal Property Value', width: 160 },
    { key: 'other_value', label: 'Other Value $', width: 120 },
    { key: 'bi_rental_income', label: 'BI/Rental Income', width: 140 },
    { key: 'total_tiv', label: 'Total TIV', width: 130, computed: true },
    { key: 'occupancy', label: 'Occupancy', width: 150 },
    { key: 'square_footage', label: 'Square Footage', width: 120, highlight: true },
    { key: 'num_units', label: '# of Units', width: 90, highlight: true },
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
    // Handle Ctrl+Z for undo (works anywhere in table)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      handleSovUndo()
      return
    }

    // Handle Ctrl+C for copy (when cell is focused, not editing)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (focusedSovCell !== null && editingSovCell === null) {
        e.preventDefault()
        handleSovCopy()
      }
      return
    }

    // Handle Ctrl+V for paste (when cell is focused)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      if (focusedSovCell !== null && editingSovCell === null) {
        // Start editing to allow paste
        setEditingSovCell(focusedSovCell)
        // Let the paste event propagate to the input
      }
      return
    }

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
            onClick={() => router.back()}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
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
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{location.location_name || location.street_address}</h2>
                  {location.entity_name && (
                    <p className="text-gray-600">{location.entity_name}</p>
                  )}
                  <p className="text-gray-600">{location.street_address}</p>
                  <p className="text-gray-600">
                    {[location.city, location.state, location.zip].filter(Boolean).join(', ')}
                  </p>
                </div>

                {/* Exposure Summary */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="bg-teal-50 rounded-xl p-5">
                    <p className="text-sm font-medium text-teal-600 mb-1">Total TIV</p>
                    <p className="text-2xl font-bold text-teal-800">
                      {(() => {
                        const tiv = (Number(location.real_property_value) || 0) + (Number(location.personal_property_value) || 0) + (Number(location.other_value) || 0) + (Number(location.bi_rental_income) || 0)
                        return tiv ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tiv) : '$0'
                      })()}
                    </p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-5">
                    <p className="text-sm font-medium text-teal-600 mb-1">Units</p>
                    <p className="text-2xl font-bold text-teal-800">
                      {location.num_units ? new Intl.NumberFormat('en-US').format(Number(location.num_units)) : '0'}
                    </p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-5">
                    <p className="text-sm font-medium text-teal-600 mb-1">Square Footage</p>
                    <p className="text-2xl font-bold text-teal-800">
                      {location.square_footage ? new Intl.NumberFormat('en-US').format(Number(location.square_footage)) : '0'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {origamiLocationIds.length > 0 && (
                    <button
                      onClick={handleExportLossLetter}
                      disabled={exporting}
                      className="px-3 py-2 text-sm text-[#006B7D] hover:bg-[#006B7D]/5 border border-[#006B7D]/30 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {exporting ? 'Exporting...' : 'Loss Letter'}
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SOV Single Line */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#006B7D] mb-1">SOV Single Line</h2>
              <p className="text-sm text-gray-500">Click to select, double-click or type to edit | Ctrl+C to copy | Ctrl+V to paste | Ctrl+Z to undo</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSovUndo}
                disabled={saving || sovUndoStack.length === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                title={sovUndoStack.length > 0 ? `Undo (${sovUndoStack.length} available) - Ctrl+Z` : 'Nothing to undo'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Undo {sovUndoStack.length > 0 && `(${sovUndoStack.length})`}
              </button>
            {editingSovCell !== null && (
              <>
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
              </>
            )}
            </div>
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
                      {sovColumns.map((col, colIndex) => {
                        const isCurrency = col.key.includes('value') || col.key === 'total_tiv' || col.key === 'bi_rental_income'
                        const isComputed = col.computed
                        const cellValue = isComputed
                          ? (Number(location.real_property_value) || 0) + (Number(location.personal_property_value) || 0) + (Number(location.other_value) || 0) + (Number(location.bi_rental_income) || 0)
                          : location[col.key]

                        return (
                        <td
                          key={col.key}
                          data-sov-cell={colIndex}
                          onClick={() => handleSovCellClick(colIndex)}
                          onDoubleClick={() => !isComputed && handleSovCellDoubleClick(colIndex)}
                          className={`px-0 py-0 text-sm whitespace-nowrap border-r border-gray-100 last:border-r-0 ${isComputed ? 'cursor-default' : 'cursor-cell'}
                            ${focusedSovCell === colIndex ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : 'hover:bg-gray-50'}
                            ${isComputed ? 'bg-teal-50 font-bold text-teal-800' : 'text-gray-900'}
                          `}
                          style={{ minWidth: col.width, maxWidth: col.width }}
                        >
                          {editingSovCell === colIndex && !isComputed ? (
                            col.type === 'dropdown' ? (
                              <select
                                data-sov-input={colIndex}
                                value={editData[col.key] || ''}
                                onChange={(e) => { handleInputChange(col.key, e.target.value); handleSave(); setEditingSovCell(null); }}
                                onBlur={handleSovInputBlur}
                                onKeyDown={(e) => handleSovInputKeyDown(e, colIndex)}
                                className="w-full h-full px-3 py-3 border-2 border-blue-500 outline-none bg-white text-gray-900 text-sm"
                                style={{ minWidth: col.width - 4 }}
                              >
                                <option value="">Select...</option>
                                {col.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                            <input
                              type={isCurrency || col.key === 'num_buildings' || col.key === 'num_units' || col.key === 'square_footage' || col.key === 'orig_year_built' ? 'number' : 'text'}
                              data-sov-input={colIndex}
                              value={editData[col.key] || ''}
                              onChange={(e) => handleInputChange(col.key, e.target.value)}
                              onBlur={handleSovInputBlur}
                              onKeyDown={(e) => handleSovInputKeyDown(e, colIndex)}
                              className="w-full h-full px-4 py-3 border-2 border-blue-500 outline-none bg-white text-gray-900 text-sm"
                              style={{ minWidth: col.width - 4 }}
                            />
                            )
                          ) : (
                            <div className="px-4 py-3 truncate" title={
                              isCurrency
                                ? cellValue ? `$${Number(cellValue).toLocaleString()}` : '-'
                                : cellValue || '-'
                            }>
                              {isCurrency
                                ? cellValue
                                  ? `$${Number(cellValue).toLocaleString()}`
                                  : <span className="text-gray-400">-</span>
                                : cellValue || <span className="text-gray-400">-</span>
                              }
                            </div>
                          )}
                        </td>
                        )
                      })}
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
                    {origamiFetched && (
                      <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#006B7D]/10 text-[#006B7D]">
                        {origamiClaims.length}
                      </span>
                    )}
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
                    {origamiFetched && (
                      <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#006B7D]/10 text-[#006B7D]">
                        {origamiPolicies.length}
                      </span>
                    )}
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Claims Tab */}
              {activeTab === 'claims' && (
                <div>
                  {origamiLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                      <p className="mt-2 text-gray-600 text-sm">Loading claims...</p>
                    </div>
                  ) : (
                    <OrigamiClaimsTable claims={origamiClaims} />
                  )}
                </div>
              )}

              {/* Policies Tab */}
              {activeTab === 'policies' && (
                <div>
                  {origamiLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                      <p className="mt-2 text-gray-600 text-sm">Loading policies...</p>
                    </div>
                  ) : (
                    <OrigamiPoliciesTable policies={origamiPolicies} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
