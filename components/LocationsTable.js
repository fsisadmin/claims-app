'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EditableCell, parseInputValue, PasteModal, TableToolbar, PaginationControls } from './locations'

// Column definitions with labels and field names
const COLUMNS = [
  // Core Location Info
  { key: 'location_name', label: 'Location Name', width: 200, type: 'text' },
  { key: 'company', label: 'Company', width: 150, type: 'text' },
  { key: 'street_address', label: 'Street Address', width: 200, type: 'text' },
  { key: 'city', label: 'City', width: 120, type: 'text' },
  { key: 'state', label: 'State', width: 80, type: 'text' },
  { key: 'zip', label: 'Zip', width: 80, type: 'text' },
  { key: 'county', label: 'County', width: 120, type: 'text' },
  { key: 'full_address', label: 'Full Address', width: 250, type: 'text' },
  { key: 'latitude', label: 'Latitude', width: 100, type: 'number' },
  { key: 'longitude', label: 'Longitude', width: 100, type: 'number' },
  { key: 'region', label: 'Region', width: 100, type: 'text' },

  // Building Info
  { key: 'num_buildings', label: '# of Bldgs', width: 90, type: 'number' },
  { key: 'num_units', label: '# of Units', width: 90, type: 'number' },
  { key: 'square_footage', label: 'Square Footage', width: 120, type: 'number', format: 'number' },
  { key: 'num_stories', label: '# of Stories', width: 90, type: 'number' },
  { key: 'current_buildings', label: 'Current Buildings', width: 130, type: 'text' },

  // Construction Details
  { key: 'iso_const', label: 'ISO Const', width: 100, type: 'select', options: [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: 'Combo', label: 'Combo' },
  ]},
  { key: 'construction_description', label: 'Construction Description', width: 200, type: 'select', options: [
    { value: 'Frame', label: 'Frame' },
    { value: 'Joisted Masonry', label: 'Joisted Masonry' },
    { value: 'Non-Combustible', label: 'Non-Combustible' },
    { value: 'Masonry Non-Combustible', label: 'Masonry Non-Combustible' },
    { value: 'Modified Fire Resistive', label: 'Modified Fire Resistive' },
    { value: 'Fire Resistive', label: 'Fire Resistive' },
    { value: 'Combo', label: 'Combo' },
  ]},
  { key: 'orig_year_built', label: 'Orig Year Built', width: 120, type: 'text' },
  { key: 'yr_bldg_updated', label: 'Yr Bldg Updated', width: 120, type: 'text' },
  { key: 'occupancy', label: 'Occupancy', width: 150, type: 'text' },
  { key: 'percent_sprinklered', label: 'Percent Sprinklered', width: 130, type: 'text' },
  { key: 'iso_prot_class', label: 'Iso Prot Class', width: 110, type: 'text' },
  { key: 'sprinklered', label: 'Sprinklered (Y/N)', width: 120, type: 'text' },

  // Financial Values
  { key: 'real_property_value', label: 'Real Property Value', width: 150, type: 'currency', format: 'currency' },
  { key: 'personal_property_value', label: 'Personal Property Value', width: 160, type: 'currency', format: 'currency' },
  { key: 'other_value', label: 'Other Value $', width: 120, type: 'currency', format: 'currency' },
  { key: 'bi_rental_income', label: 'BI/Rental Income', width: 140, type: 'currency', format: 'currency' },
  { key: 'total_tiv', label: 'Total TIV', width: 130, type: 'currency', format: 'currency' },
  { key: 'deductible', label: 'Deductible', width: 100, type: 'text' },
  { key: 'nws_deductible', label: 'NWS Deductible', width: 120, type: 'text' },
  { key: 'wind_hail_deductible', label: 'Wind/Hail Deductible', width: 140, type: 'text' },
  { key: 'self_insured_retention', label: 'Self Insured Retention', width: 150, type: 'text' },
  { key: 'tiv_if_tier_1_wind_yes', label: 'TIV If Tier 1 Wind Yes', width: 150, type: 'currency', format: 'currency' },

  // Risk Assessment
  { key: 'flood_zone', label: 'Flood Zone', width: 100, type: 'text' },
  { key: 'is_prop_within_1000ft_saltwater', label: 'Within 1000ft Saltwater', width: 170, type: 'text' },
  { key: 'tier_1_wind', label: 'Tier 1 Wind', width: 100, type: 'text' },
  { key: 'coastal_flooding', label: 'Coastal Flooding', width: 130, type: 'text' },
  { key: 'coastal_flooding_risk', label: 'Coastal Flooding Risk', width: 150, type: 'text' },
  { key: 'earthquake', label: 'Earthquake', width: 100, type: 'text' },
  { key: 'earthquake_risk', label: 'Earthquake Risk', width: 130, type: 'text' },
  { key: 'strong_wind', label: 'Strong Wind', width: 100, type: 'text' },
  { key: 'tornado', label: 'Tornado', width: 90, type: 'text' },
  { key: 'tornado_risk', label: 'Tornado Risk', width: 110, type: 'text' },
  { key: 'wildfire', label: 'Wildfire', width: 90, type: 'text' },
  { key: 'wildfire_risk', label: 'Wildfire Risk', width: 110, type: 'text' },

  // Entity & Insurance
  { key: 'entity_name', label: 'Entity Name', width: 200, type: 'text' },
  { key: 'lenders', label: 'Lenders', width: 200, type: 'text' },
  { key: 'lender_name_rollup', label: 'Lender Name Rollup', width: 180, type: 'text' },
  { key: 'policies', label: 'Policies', width: 120, type: 'text' },
  { key: 'policy', label: 'Policy', width: 120, type: 'text' },
  { key: 'policy_id', label: 'Policy ID', width: 100, type: 'text' },
  { key: 'coverage', label: 'Coverage', width: 200, type: 'text' },
  { key: 'loss_run_summary', label: 'Loss Run Summary', width: 150, type: 'text' },
  { key: 'policies_25_26', label: '25-26 Policies', width: 120, type: 'text' },

  // Certificates - EPI
  { key: 'epi', label: 'EPI', width: 80, type: 'text' },
  { key: 'epi_certificate', label: 'EPI Certificate', width: 120, type: 'text' },
  { key: 'epi_certificate_recipients', label: 'EPI Certificate Recipients', width: 180, type: 'text' },
  { key: 'epi_certificate_to_use', label: 'EPI Certificate To Use', width: 160, type: 'text' },
  { key: 'epi_certificate_to_use_name', label: 'EPI Certificate Name', width: 160, type: 'text' },
  { key: 'location_epi_additional_remarks', label: 'EPI Additional Remarks', width: 180, type: 'text' },
  { key: 'is_commercial_coverage_blanket', label: 'Commercial Coverage Blanket', width: 190, type: 'text' },

  // Certificates - COI
  { key: 'coi_certificate', label: 'COI Certificate', width: 120, type: 'text' },
  { key: 'coi_certificate_recipients', label: 'COI Certificate Recipients', width: 180, type: 'text' },
  { key: 'coi_certificate_to_use', label: 'COI Certificate To Use', width: 160, type: 'text' },
  { key: 'coi_location_specific_additional_remarks', label: 'COI Additional Remarks', width: 180, type: 'text' },

  // Claims Data
  { key: 'claims', label: 'Claims', width: 100, type: 'text' },
  { key: 'documents_for_location', label: 'Documents for Location', width: 160, type: 'text' },
  { key: 'open_claim_rollup', label: 'Open Claim Rollup', width: 130, type: 'number' },
  { key: 'total_open_claims_rollup', label: 'Total Open Claims Rollup', width: 160, type: 'currency', format: 'currency' },
  { key: 'total_incurred_five_years_prop', label: 'Total Incurred 5Yr Prop', width: 160, type: 'currency', format: 'currency' },
  { key: 'total_incurred_five_years_gl', label: 'Total Incurred 5Yr GL', width: 160, type: 'currency', format: 'currency' },

  // Status & Dates
  { key: 'status', label: 'Status', width: 100, type: 'text' },
  { key: 'date_sold', label: 'Date Sold', width: 100, type: 'date' },
  { key: 'projected_close_date', label: 'Projected Close Date', width: 150, type: 'date' },

  // Acquisition
  { key: 'acquisitions_clients', label: 'Acquisitions Clients', width: 150, type: 'text' },
  { key: 'acquisition_address', label: 'Acquisition Address', width: 180, type: 'text' },
  { key: 'om', label: 'OM', width: 80, type: 'text' },

  // IDs
  { key: 'source_id', label: 'ID', width: 80, type: 'text' },
  { key: 'id_location', label: 'ID-Location', width: 120, type: 'text' },
]


export default function LocationsTable({ locations = [], clientId, organizationId, onRefresh }) {
  const router = useRouter()
  const [data, setData] = useState(locations)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteData, setPasteData] = useState('')
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [focusedCell, setFocusedCell] = useState({ row: null, col: null })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [undoStack, setUndoStack] = useState([]) // Stack for undo history
  const tableRef = useRef(null)

  useEffect(() => {
    setData(locations)
  }, [locations])

  // Handle cell focus
  const handleCellFocus = useCallback((rowIndex, colIndex) => {
    setFocusedCell({ row: rowIndex, col: colIndex })
  }, [])

  // Handle column header click for sorting
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  // Filter data
  const filteredData = data.filter(location => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      location.location_name?.toLowerCase().includes(search) ||
      location.city?.toLowerCase().includes(search) ||
      location.state?.toLowerCase().includes(search) ||
      location.street_address?.toLowerCase().includes(search)
    )
  })

  // Sort filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0

    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return sortDirection === 'asc' ? 1 : -1
    if (bVal == null) return sortDirection === 'asc' ? -1 : 1

    // Get column type
    const col = COLUMNS.find(c => c.key === sortColumn)

    // Numeric comparison
    if (col?.type === 'number' || col?.type === 'currency') {
      const aNum = parseFloat(aVal) || 0
      const bNum = parseFloat(bVal) || 0
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    }

    // String comparison
    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr)
    } else {
      return bStr.localeCompare(aStr)
    }
  })

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = sortedData.slice(startIndex, endIndex)

  // Reset to page 1 when search/sort changes data
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortColumn, sortDirection])

  // Handle paste into table cells (Excel-style multi-cell paste)
  const handleTablePaste = useCallback(async (e) => {
    // Only handle if we have a focused cell
    if (focusedCell.row === null || focusedCell.col === null) return

    const clipboardData = e.clipboardData?.getData('text')
    if (!clipboardData) return

    e.preventDefault()

    // Parse clipboard data (tab-separated columns, newline-separated rows)
    const normalizedData = clipboardData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const pastedRows = normalizedData.split('\n').filter(row => row.trim())

    if (pastedRows.length === 0) return

    // Check if this is multi-cell paste (has tabs or multiple rows)
    const hasMultipleCells = pastedRows.length > 1 || pastedRows[0].includes('\t')

    if (!hasMultipleCells) {
      // Single cell paste - let the cell handle it normally
      return
    }

    setSaving(true)

    try {
      const updates = []
      const startRowIndex = focusedCell.row
      const startColIndex = focusedCell.col

      pastedRows.forEach((pastedRow, rowOffset) => {
        const cells = pastedRow.split('\t')
        const targetRowIndex = startRowIndex + rowOffset

        // Skip if we're past the data on current page
        if (targetRowIndex >= paginatedData.length) return

        const targetRow = paginatedData[targetRowIndex]

        cells.forEach((cellValue, colOffset) => {
          const targetColIndex = startColIndex + colOffset

          // Skip if we're past the columns
          if (targetColIndex >= COLUMNS.length) return

          const column = COLUMNS[targetColIndex]
          const cleanedValue = cellValue.trim().replace(/^"|"$/g, '')
          const parsedValue = parseInputValue(cleanedValue, column.type)

          updates.push({
            rowId: targetRow.id,
            field: column.key,
            value: parsedValue
          })
        })
      })

      // Apply all updates
      for (const update of updates) {
        // Security: Include organization_id in the update query to prevent cross-org edits
        const { error } = await supabase
          .from('locations')
          .update({ [update.field]: update.value })
          .eq('id', update.rowId)
          .eq('organization_id', organizationId)

        if (error) throw error

        // Update local state
        setData(prev => prev.map(row =>
          row.id === update.rowId ? { ...row, [update.field]: update.value } : row
        ))
      }

      if (updates.length > 0) {
        console.log(`Pasted ${updates.length} cell(s) across ${pastedRows.length} row(s)`)
      }
    } catch (error) {
      console.error('Error pasting:', error)
      alert('Failed to paste data: ' + error.message)
    } finally {
      setSaving(false)
    }
  }, [focusedCell, paginatedData, organizationId])

  // Attach paste listener to table
  useEffect(() => {
    const tableElement = tableRef.current
    if (!tableElement) return

    tableElement.addEventListener('paste', handleTablePaste)
    return () => {
      tableElement.removeEventListener('paste', handleTablePaste)
    }
  }, [handleTablePaste])

  // Undo last change
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return

    const lastAction = undoStack[undoStack.length - 1]
    setSaving(true)

    try {
      const { error } = await supabase
        .from('locations')
        .update({ [lastAction.field]: lastAction.oldValue })
        .eq('id', lastAction.rowId)
        .eq('organization_id', organizationId)

      if (error) throw error

      // Remove from undo stack
      setUndoStack(prev => prev.slice(0, -1))

      // Update local state
      setData(prev => prev.map(row =>
        row.id === lastAction.rowId ? { ...row, [lastAction.field]: lastAction.oldValue } : row
      ))
    } catch (error) {
      console.error('Error undoing:', error)
      alert('Failed to undo')
    } finally {
      setSaving(false)
    }
  }, [undoStack, organizationId])

  // Copy focused cell value to clipboard
  const handleCopy = useCallback(async () => {
    if (focusedCell.row === null || focusedCell.col === null) return

    const row = paginatedData[focusedCell.row]
    if (!row) return

    const column = COLUMNS[focusedCell.col]
    if (!column) return

    const value = row[column.key]
    const textValue = value != null ? String(value) : ''

    try {
      await navigator.clipboard.writeText(textValue)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [focusedCell, paginatedData])

  // Handle keyboard navigation between cells
  const handleKeyNavigation = useCallback((e) => {
    // Handle Ctrl+Z for undo (works anywhere in table)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      handleUndo()
      return
    }

    // Handle Ctrl+C for copy (when cell is focused)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (focusedCell.row !== null && focusedCell.col !== null) {
        // Don't prevent default if in input - let native copy work
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          handleCopy()
        }
      }
      return
    }

    if (focusedCell.row === null || focusedCell.col === null) return

    // Only handle arrow keys when not in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    let newRow = focusedCell.row
    let newCol = focusedCell.col

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, focusedCell.row - 1)
        e.preventDefault()
        break
      case 'ArrowDown':
        newRow = Math.min(paginatedData.length - 1, focusedCell.row + 1)
        e.preventDefault()
        break
      case 'ArrowLeft':
        newCol = Math.max(0, focusedCell.col - 1)
        e.preventDefault()
        break
      case 'ArrowRight':
        newCol = Math.min(COLUMNS.length - 1, focusedCell.col + 1)
        e.preventDefault()
        break
      case 'Tab':
        if (e.shiftKey) {
          newCol = focusedCell.col - 1
          if (newCol < 0) {
            newCol = COLUMNS.length - 1
            newRow = Math.max(0, focusedCell.row - 1)
          }
        } else {
          newCol = focusedCell.col + 1
          if (newCol >= COLUMNS.length) {
            newCol = 0
            newRow = Math.min(paginatedData.length - 1, focusedCell.row + 1)
          }
        }
        e.preventDefault()
        break
      default:
        return
    }

    if (newRow !== focusedCell.row || newCol !== focusedCell.col) {
      setFocusedCell({ row: newRow, col: newCol })
    }
  }, [focusedCell, paginatedData.length, handleUndo, handleCopy])

  // Attach keyboard navigation listener
  useEffect(() => {
    const tableElement = tableRef.current
    if (!tableElement) return

    tableElement.addEventListener('keydown', handleKeyNavigation)
    return () => {
      tableElement.removeEventListener('keydown', handleKeyNavigation)
    }
  }, [handleKeyNavigation])

  // Auto-scroll to keep focused cell visible
  useEffect(() => {
    if (focusedCell.row === null || focusedCell.col === null) return

    // Find the cell element and scroll it into view
    const cellElement = document.querySelector(`[data-cell="${focusedCell.row}-${focusedCell.col}"]`)
    if (cellElement && tableRef.current) {
      const tableContainer = tableRef.current
      const cellRect = cellElement.getBoundingClientRect()
      const containerRect = tableContainer.getBoundingClientRect()

      // Account for sticky columns (checkbox ~40px + row number ~48px = ~88px)
      const stickyOffset = 88

      // Horizontal scroll - check if cell is outside visible area
      if (cellRect.left < containerRect.left + stickyOffset) {
        // Cell is to the left of sticky columns, scroll left
        const scrollAmount = cellRect.left - containerRect.left - stickyOffset - 10
        tableContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      } else if (cellRect.right > containerRect.right) {
        // Cell is to the right, scroll right
        const scrollAmount = cellRect.right - containerRect.right + 10
        tableContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      }

      // Vertical scroll - check if cell is outside visible area
      const headerHeight = 48 // Approximate header height
      if (cellRect.top < containerRect.top + headerHeight) {
        // Cell is above visible area, scroll up
        const scrollAmount = cellRect.top - containerRect.top - headerHeight - 10
        tableContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' })
      } else if (cellRect.bottom > containerRect.bottom) {
        // Cell is below visible area, scroll down
        const scrollAmount = cellRect.bottom - containerRect.bottom + 10
        tableContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' })
      }
    }
  }, [focusedCell])

  // Save cell change to database
  const handleCellSave = useCallback(async (rowId, field, value) => {
    // Get old value for undo stack
    const oldRow = data.find(r => r.id === rowId)
    const oldValue = oldRow ? oldRow[field] : null

    setSaving(true)
    try {
      // Security: Include organization_id in the update query to prevent cross-org edits
      const { error } = await supabase
        .from('locations')
        .update({ [field]: value })
        .eq('id', rowId)
        .eq('organization_id', organizationId)

      if (error) throw error

      // Push to undo stack (limit to 50 actions)
      setUndoStack(prev => [...prev.slice(-49), { rowId, field, oldValue, newValue: value }])

      // Update local state
      setData(prev => prev.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      ))
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [organizationId, data])

  // Toggle row selection
  const toggleRowSelection = (rowId) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  // Select all rows on current page
  const toggleSelectAll = () => {
    const pageRowIds = paginatedData.map(r => r.id)
    const allPageSelected = pageRowIds.every(id => selectedRows.has(id))

    if (allPageSelected) {
      // Deselect all on this page
      setSelectedRows(prev => {
        const next = new Set(prev)
        pageRowIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // Select all on this page
      setSelectedRows(prev => {
        const next = new Set(prev)
        pageRowIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  // Delete selected rows
  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} location(s)?`)) return

    setSaving(true)
    try {
      // Security: Include organization_id in the delete query to prevent cross-org deletes
      const { error } = await supabase
        .from('locations')
        .delete()
        .in('id', Array.from(selectedRows))
        .eq('organization_id', organizationId)

      if (error) throw error

      setData(prev => prev.filter(row => !selectedRows.has(row.id)))
      setSelectedRows(new Set())
      onRefresh?.()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete locations')
    } finally {
      setSaving(false)
    }
  }

  // Duplicate selected rows
  const handleDuplicateSelected = async () => {
    if (selectedRows.size === 0) return

    setSaving(true)
    try {
      const rowsToDuplicate = data.filter(row => selectedRows.has(row.id))
      const newRows = rowsToDuplicate.map(row => {
        const { id, created_at, updated_at, ...rest } = row
        return {
          ...rest,
          location_name: `${row.location_name || 'Location'} (Copy)`,
          client_id: clientId,
          organization_id: organizationId,
        }
      })

      const { data: insertedRows, error } = await supabase
        .from('locations')
        .insert(newRows)
        .select()

      if (error) throw error

      setData(prev => [...prev, ...insertedRows])
      setSelectedRows(new Set())
      onRefresh?.()
    } catch (error) {
      console.error('Error duplicating:', error)
      alert('Failed to duplicate locations')
    } finally {
      setSaving(false)
    }
  }

  // Add new row
  const handleAddRow = async () => {
    setSaving(true)
    try {
      const { data: newRow, error } = await supabase
        .from('locations')
        .insert({
          client_id: clientId,
          organization_id: organizationId,
          location_name: 'New Location',
        })
        .select()
        .single()

      if (error) throw error

      // Add new row to the end
      setData(prev => [...prev, newRow])

      // Clear sorting so new row appears at the bottom
      setSortColumn(null)
      setSortDirection('asc')

      // Calculate the last page after adding and navigate to it
      const newTotal = data.length + 1
      const lastPage = Math.ceil(newTotal / pageSize)
      setCurrentPage(lastPage)

      // Focus the first editable cell of the new row (after render)
      setTimeout(() => {
        const newRowIndex = (newTotal - 1) % pageSize // Index on the last page
        setFocusedCell({ row: newRowIndex, col: 0 })
      }, 100)
      // Don't call onRefresh() here - it would re-fetch and re-sort data from DB
    } catch (error) {
      console.error('Error adding row:', error)
      alert('Failed to add new location')
    } finally {
      setSaving(false)
    }
  }

  // Excel header to database column mapping
  const HEADER_MAP = {
    'location name': 'location_name',
    'company': 'company',
    'street address': 'street_address',
    'city': 'city',
    'state': 'state',
    'zip': 'zip',
    'county': 'county',
    'full address': 'full_address',
    'latitude': 'latitude',
    'longitude': 'longitude',
    'latitude-python': 'latitude_python',
    'longitude-python': 'longitude_python',
    'region': 'region',
    'region (from state)': 'region',
    'state (from state)': 'state_from_state',
    'condensed citystatezip': 'condensed_city_state_zip',
    'zipcode trimmed': 'zipcode_trimmed',
    '# of bldgs': 'num_buildings',
    'number of bldgs': 'num_buildings',
    '# of units': 'num_units',
    'number of units': 'num_units',
    'square footage': 'square_footage',
    '# of stories': 'num_stories',
    'number of stories': 'num_stories',
    'current buildings': 'current_buildings',
    'iso const': 'iso_const',
    'construction description': 'construction_description',
    'orig year built': 'orig_year_built',
    'yr bldg updated (mand if >25 yrs)': 'yr_bldg_updated',
    'yr bldg updated': 'yr_bldg_updated',
    'occupancy': 'occupancy',
    'percent sprinklered': 'percent_sprinklered',
    'iso prot class': 'iso_prot_class',
    'sprinklered (y/n)': 'sprinklered',
    'sprinklered': 'sprinklered',
    'real property value': 'real_property_value',
    'personal property value': 'personal_property_value',
    'other value $ (outdoor prop & eqpt must be sch\'d)': 'other_value',
    'other value $': 'other_value',
    'other value': 'other_value',
    'bi/rental income': 'bi_rental_income',
    'total tiv': 'total_tiv',
    'deductible': 'deductible',
    'nws deductible': 'nws_deductible',
    'wind/hail deductible': 'wind_hail_deductible',
    'self insured rentention': 'self_insured_retention',
    'self insured retention': 'self_insured_retention',
    'tiv if tier 1 wind yes': 'tiv_if_tier_1_wind_yes',
    'flood zone': 'flood_zone',
    'is prop within 1000 ft of saltwater': 'is_prop_within_1000ft_saltwater',
    'is prop within 1000ft saltwater': 'is_prop_within_1000ft_saltwater',
    'tier 1 wind': 'tier_1_wind',
    'coastal flooding': 'coastal_flooding',
    'coastal flooding risk': 'coastal_flooding_risk',
    'earthquake': 'earthquake',
    'earthquake risk': 'earthquake_risk',
    'strong wind': 'strong_wind',
    'tornado': 'tornado',
    'tornado risk': 'tornado_risk',
    'wildfire': 'wildfire',
    'wildfire risk': 'wildfire_risk',
    'entity name': 'entity_name',
    'lenders': 'lenders',
    'lender name rollup (from lenders)': 'lender_name_rollup',
    'lender name rollup': 'lender_name_rollup',
    'policies': 'policies',
    'policy': 'policy',
    'policy id': 'policy_id',
    'coverage': 'coverage',
    'coverage (from 25-26 policies)': 'coverage',
    'loss run summary': 'loss_run_summary',
    '25-26 policies': 'policies_25_26',
    'epi': 'epi',
    'epi certificate': 'epi_certificate',
    'epi certificate recipients': 'epi_certificate_recipients',
    'epi certificate to use': 'epi_certificate_to_use',
    'name (from epi certificate to use)': 'epi_certificate_to_use_name',
    'location epi additional remarks': 'location_epi_additional_remarks',
    'is the commercial coverage property blanket or broken out by location (from epi)': 'is_commercial_coverage_blanket',
    'coi certificate': 'coi_certificate',
    'coi certificate recipients': 'coi_certificate_recipients',
    'coi certificate to use': 'coi_certificate_to_use',
    'coi location specific additional remarks': 'coi_location_specific_additional_remarks',
    'claims': 'claims',
    'documents for location': 'documents_for_location',
    'open claim rollup (from claims)': 'open_claim_rollup',
    'open claim rollup': 'open_claim_rollup',
    'total open claims rollup (from claims)': 'total_open_claims_rollup',
    'total open claims rollup': 'total_open_claims_rollup',
    'total incurred five years prop': 'total_incurred_five_years_prop',
    'total incurred five years gl': 'total_incurred_five_years_gl',
    'status': 'status',
    'date sold': 'date_sold',
    'projected close date': 'projected_close_date',
    'acquistions clients': 'acquisitions_clients',
    'acquisitions clients': 'acquisitions_clients',
    'acquisition address': 'acquisition_address',
    'om': 'om',
    'id': 'source_id',
    'id-location': 'id_location',
    'user client name': 'user_client_name',
    'client name': 'client_name_source',
  }

  // Handle paste from Excel
  const handlePaste = async () => {
    if (!pasteData.trim()) return

    setSaving(true)
    try {
      // Handle both Windows (\r\n) and Unix (\n) line endings
      const normalizedData = pasteData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const rows = normalizedData.split('\n').filter(row => row.trim())

      if (rows.length === 0) {
        alert('No data found to paste')
        setSaving(false)
        return
      }

      // Parse first row to check for headers
      const firstRowCells = rows[0].split('\t')
      let dataRows = rows
      let headerMap = []

      // Check if first row looks like headers by matching against our known headers
      const possibleHeaders = firstRowCells.map(h => h.toLowerCase().trim().replace(/"/g, ''))
      let matchCount = 0

      possibleHeaders.forEach(h => {
        if (HEADER_MAP[h] || COLUMNS.find(c => c.key === h || c.label.toLowerCase() === h)) {
          matchCount++
        }
      })

      // If more than 30% of first row matches known headers, treat as header row
      if (matchCount >= Math.max(1, firstRowCells.length * 0.3)) {
        headerMap = possibleHeaders.map(h => {
          // First check our explicit mapping
          if (HEADER_MAP[h]) return HEADER_MAP[h]
          // Then check column definitions
          const col = COLUMNS.find(c => c.key === h || c.label.toLowerCase() === h)
          return col ? col.key : null
        })
        dataRows = rows.slice(1)
      } else {
        // No headers - use default column order
        headerMap = COLUMNS.slice(0, firstRowCells.length).map(c => c.key)
      }

      console.log('Header mapping:', headerMap)
      console.log('Data rows:', dataRows.length)

      const newLocations = dataRows.map(row => {
        const cells = row.split('\t')
        const location = {
          client_id: clientId,
          organization_id: organizationId,
        }

        cells.forEach((cell, index) => {
          const key = headerMap[index]
          const cleanedCell = cell.trim().replace(/^"|"$/g, '') // Remove surrounding quotes

          if (key && key !== 'id' && key !== 'source_id' && cleanedCell) {
            const col = COLUMNS.find(c => c.key === key)
            const parsedValue = parseInputValue(cleanedCell, col?.type || 'text')
            if (parsedValue !== null && parsedValue !== '') {
              location[key] = parsedValue
            }
          }
        })

        return location
      }).filter(loc => {
        // Filter out rows that only have client_id and organization_id
        const keys = Object.keys(loc).filter(k => k !== 'client_id' && k !== 'organization_id')
        return keys.length > 0
      })

      if (newLocations.length === 0) {
        alert('No valid data found to paste. Make sure your Excel data has headers that match the expected columns.')
        setSaving(false)
        return
      }

      console.log('Inserting locations:', newLocations.length)

      const { data: insertedRows, error } = await supabase
        .from('locations')
        .insert(newLocations)
        .select()

      if (error) throw error

      setData(prev => [...prev, ...insertedRows])
      setShowPasteModal(false)
      setPasteData('')
      onRefresh?.()
      alert(`Successfully added ${insertedRows.length} location(s)!`)
    } catch (error) {
      console.error('Error pasting:', error)
      alert('Failed to paste data: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (data.length === 0 && !showPasteModal) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleAddRow}
            disabled={saving}
            className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </button>
          <button
            onClick={() => setShowPasteModal(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Paste from Excel
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No locations found for this client.</p>
          <p className="text-sm mt-2">Add a location or paste from Excel to get started.</p>
        </div>

        {/* Paste Modal */}
        {showPasteModal && (
          <PasteModal
            pasteData={pasteData}
            setPasteData={setPasteData}
            onPaste={handlePaste}
            onClose={() => { setShowPasteModal(false); setPasteData('') }}
            saving={saving}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <TableToolbar
        onAddRow={handleAddRow}
        onPasteExcel={() => setShowPasteModal(true)}
        onDuplicate={handleDuplicateSelected}
        onDelete={handleDeleteSelected}
        onUndo={handleUndo}
        undoCount={undoStack.length}
        selectedCount={selectedRows.size}
        saving={saving}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalCount={sortedData.length}
      />

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="overflow-x-auto max-h-[600px] overflow-y-auto focus:outline-none"
          ref={tableRef}
          tabIndex={0}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {/* Checkbox column */}
                <th className="w-10 px-2 py-3 bg-gray-50 border-r border-gray-200 sticky left-0 z-20">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every(r => selectedRows.has(r.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#006B7D] focus:ring-[#006B7D]"
                  />
                </th>
                {/* Row number column */}
                <th className="w-12 px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-r border-gray-200 sticky left-10 z-20">
                  #
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 select-none"
                    style={{ minWidth: col.width }}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <span className="text-gray-400">
                        {sortColumn === col.key ? (
                          sortDirection === 'asc' ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )
                        ) : (
                          <svg className="w-3 h-3 opacity-0 group-hover:opacity-50" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedData.map((location, index) => (
                <tr
                  key={location.id}
                  className={`${selectedRows.has(location.id) ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}
                >
                  {/* Checkbox */}
                  <td className="w-10 px-2 py-0 bg-white border-r border-gray-100 sticky left-0">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(location.id)}
                      onChange={() => toggleRowSelection(location.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#006B7D] focus:ring-[#006B7D]"
                    />
                  </td>
                  {/* Row number */}
                  <td className="w-12 px-2 py-0 text-xs text-gray-600 font-medium bg-white border-r border-gray-100 sticky left-10">
                    {startIndex + index + 1}
                  </td>
                  {COLUMNS.map((col, colIndex) => (
                    <td
                      key={col.key}
                      data-cell={`${index}-${colIndex}`}
                      className="px-0 py-0 text-sm border-r border-gray-100 last:border-r-0"
                      style={{ minWidth: col.width, maxWidth: col.width }}
                    >
                      {col.key === 'location_name' ? (
                        <div
                          onClick={() => router.push(`/clients/${clientId}/locations/${location.id}`)}
                          className={`w-full h-full px-2 py-2 cursor-pointer truncate text-[#006B7D] hover:text-[#008BA3] hover:underline font-medium
                            ${selectedRows.has(location.id) ? 'bg-blue-50' : ''}
                          `}
                          title={location[col.key] || 'View Location'}
                        >
                          {location[col.key] || <span className="text-gray-400">-</span>}
                        </div>
                      ) : (
                        <EditableCell
                          value={location[col.key]}
                          column={col}
                          rowId={location.id}
                          rowIndex={index}
                          colIndex={colIndex}
                          onSave={handleCellSave}
                          isSelected={selectedRows.has(location.id)}
                          isFocused={focusedCell.row === index && focusedCell.col === colIndex}
                          onFocus={handleCellFocus}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {sortedData.length > pageSize && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          startIndex={startIndex}
          endIndex={endIndex}
          totalCount={sortedData.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
        />
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <PasteModal
          pasteData={pasteData}
          setPasteData={setPasteData}
          onPaste={handlePaste}
          onClose={() => { setShowPasteModal(false); setPasteData('') }}
          saving={saving}
        />
      )}
    </div>
  )
}
