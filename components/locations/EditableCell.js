'use client'

import { useState, useRef, useEffect } from 'react'

function formatDisplayValue(value, format, column) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  // For select type columns, show the label instead of just the value
  if (column?.type === 'select' && column?.options) {
    const option = column.options.find(opt => opt.value === value)
    if (option) return option.label
    return value // Fall back to raw value if no matching option
  }

  if (format === 'currency') {
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  if (format === 'number') {
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return new Intl.NumberFormat('en-US').format(num)
  }

  return value
}

function parseInputValue(value, type) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  if (type === 'number' || type === 'currency') {
    const cleaned = String(value).replace(/[$,]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  return value
}

export { formatDisplayValue, parseInputValue }

export default function EditableCell({ value, displayValue, column, rowId, rowIndex, colIndex, onSave, isSelected, isFocused, onFocus }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')
  const inputRef = useRef(null)
  const cellRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value ?? '')
  }, [value])

  const handleDoubleClick = () => {
    setIsEditing(true)
    if (column.type === 'currency' && value) {
      setEditValue(value)
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    onFocus(rowIndex, colIndex)
  }

  const handleBlur = () => {
    setIsEditing(false)
    const parsedValue = parseInputValue(editValue, column.type)
    if (parsedValue !== value) {
      onSave(rowId, column.key, parsedValue)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isEditing) {
        e.target.blur()
      } else {
        setIsEditing(true)
      }
    }
    if (e.key === 'Escape') {
      setEditValue(value ?? '')
      setIsEditing(false)
    }
    if (e.key === 'Tab') {
      e.target.blur()
    }
  }

  const handleCellKeyDown = (e) => {
    if (!isEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setIsEditing(true)
      setEditValue(e.key)
      e.preventDefault()
    }
    if (e.key === 'Enter' && !isEditing) {
      setIsEditing(true)
      e.preventDefault()
    }
  }

  if (isEditing) {
    // Render dropdown for select type columns
    if (column.type === 'select' && column.options) {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            onSave(rowId, column.key, e.target.value || null)
            setIsEditing(false)
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-2 py-1 border-2 border-blue-500 rounded outline-none bg-white text-sm text-gray-900"
          style={{ minWidth: column.width - 16 }}
        >
          <option value="">Select...</option>
          {column.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        ref={inputRef}
        type={column.type === 'date' ? 'date' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 py-1 border-2 border-blue-500 rounded outline-none bg-white text-sm text-gray-900"
        style={{ minWidth: column.width - 16 }}
      />
    )
  }

  // Use displayValue if provided, otherwise format the value
  const shownValue = displayValue !== undefined ? displayValue : formatDisplayValue(value, column.format, column)

  return (
    <div
      ref={cellRef}
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      className={`w-full h-full px-2 py-2 cursor-cell truncate text-gray-900 outline-none
        ${isSelected ? 'bg-blue-50' : ''}
        ${isFocused ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : ''}
      `}
      title={shownValue || ''}
    >
      {shownValue || <span className="text-gray-400">-</span>}
    </div>
  )
}
