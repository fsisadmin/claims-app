'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/hooks'

// ─── Upload Type Configurations ─────────────────────────────────────────────

const UPLOAD_TYPES = [
  {
    key: 'claims',
    label: 'Claims',
    description: 'Upload loss runs and claims data',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    table: 'claims',
    successTab: 'claims',
  },
  {
    key: 'incidents',
    label: 'Incidents',
    description: 'Upload incident reports',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    table: 'incidents',
    successTab: 'incidents',
  },
  {
    key: 'sov',
    label: 'SOV / Locations',
    description: 'Upload schedule of values and location data',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    table: 'locations',
    successTab: 'locations',
  },
]

// ─── Claims Header Map ──────────────────────────────────────────────────────

const CLAIMS_HEADER_MAP = {
  'claim number': 'claim_number',
  'claim #': 'claim_number',
  'claim_number': 'claim_number',
  'claimant': 'claimant',
  'claimant name': 'claimant',
  'coverage': 'coverage',
  'coverage type': 'coverage',
  'property name': 'property_name',
  'property': 'property_name',
  'location': 'property_name',
  'location name': 'property_name',
  'status': 'status',
  'claim status': 'status',
  'loss date': 'loss_date',
  'date of loss': 'loss_date',
  'loss_date': 'loss_date',
  'report date': 'report_date',
  'reported date': 'report_date',
  'date reported': 'report_date',
  'report_date': 'report_date',
  'closed date': 'closed_date',
  'close date': 'closed_date',
  'closed_date': 'closed_date',
  'policy number': 'policy_number',
  'policy #': 'policy_number',
  'policy_number': 'policy_number',
  'policy no': 'policy_number',
  'tpa claim number': 'tpa_claim_number',
  'tpa claim #': 'tpa_claim_number',
  'tpa #': 'tpa_claim_number',
  'tpa_claim_number': 'tpa_claim_number',
  'loss description': 'loss_description',
  'description': 'loss_description',
  'loss_description': 'loss_description',
  'description of loss': 'loss_description',
  'total incurred': 'total_incurred',
  'incurred': 'total_incurred',
  'total_incurred': 'total_incurred',
  'total paid': 'total_paid',
  'paid': 'total_paid',
  'total_paid': 'total_paid',
  'total reserved': 'total_reserved',
  'reserved': 'total_reserved',
  'reserves': 'total_reserved',
  'total_reserved': 'total_reserved',
  'deductible': 'deductible',
  'sir': 'sir',
  'self insured retention': 'sir',
  'claim type': 'claim_type',
  'type': 'claim_type',
  'claim_type': 'claim_type',
  'cause of loss': 'cause_of_loss',
  'cause': 'cause_of_loss',
  'cause_of_loss': 'cause_of_loss',
  'adjuster name': 'adjuster_name',
  'adjuster': 'adjuster_name',
  'adjuster_name': 'adjuster_name',
  'adjuster email': 'adjuster_email',
  'adjuster_email': 'adjuster_email',
  'adjuster phone': 'adjuster_phone',
  'adjuster_phone': 'adjuster_phone',
  'attorney name': 'attorney_name',
  'attorney': 'attorney_name',
  'attorney_name': 'attorney_name',
  'attorney firm': 'attorney_firm',
  'attorney_firm': 'attorney_firm',
  'carrier': 'carrier',
  'insurance carrier': 'carrier',
  'policy name': 'policy_name',
  'policy_name': 'policy_name',
  'carrier policy number': 'carrier_policy_number',
  'carrier_policy_number': 'carrier_policy_number',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
}

const CLAIMS_CURRENCY_FIELDS = new Set(['total_incurred', 'total_paid', 'total_reserved', 'deductible', 'sir'])
const CLAIMS_DATE_FIELDS = new Set(['loss_date', 'report_date', 'closed_date'])
const CLAIMS_PREVIEW_COLUMNS = [
  'claim_number', 'claimant', 'coverage', 'property_name', 'status',
  'loss_date', 'report_date', 'policy_number', 'total_incurred',
  'claim_type', 'cause_of_loss', 'loss_description'
]
const CLAIMS_HEADER_HINT = 'Claim Number, Claimant, Coverage, Property Name, Status, Loss Date, Report Date, Policy Number, TPA Claim Number, Total Incurred, Total Paid, Total Reserved, Claim Type, Cause of Loss, Adjuster Name, Carrier, Loss Description, Notes'

// ─── Incidents Header Map ───────────────────────────────────────────────────

const INCIDENTS_HEADER_MAP = {
  'incident type': 'incident_type',
  'type': 'incident_type',
  'incident_type': 'incident_type',
  'incident details': 'incident_details',
  'details': 'incident_details',
  'incident_details': 'incident_details',
  'property name': 'property_name',
  'property': 'property_name',
  'location': 'property_name',
  'location name': 'property_name',
  'incident only': 'incident_only',
  'incident_only': 'incident_only',
  'loss date': 'loss_date',
  'date of loss': 'loss_date',
  'loss_date': 'loss_date',
  'incident date': 'loss_date',
  'date of incident': 'loss_date',
  'report date': 'report_date',
  'reported date': 'report_date',
  'date reported': 'report_date',
  'report_date': 'report_date',
  'event description': 'event_description',
  'description': 'event_description',
  'event_description': 'event_description',
  'status': 'status',
  'incident status': 'status',
  'reported by': 'reported_by',
  'reporter': 'reported_by',
  'reported_by': 'reported_by',
  'reported by email': 'reported_by_email',
  'reporter email': 'reported_by_email',
  'reported_by_email': 'reported_by_email',
  'reported by phone': 'reported_by_phone',
  'reporter phone': 'reported_by_phone',
  'reported_by_phone': 'reported_by_phone',
  'cause of loss': 'cause_of_loss',
  'cause': 'cause_of_loss',
  'cause_of_loss': 'cause_of_loss',
  'injuries reported': 'injuries_reported',
  'injuries': 'injuries_reported',
  'injuries_reported': 'injuries_reported',
  'police report filed': 'police_report_filed',
  'police report': 'police_report_filed',
  'police_report_filed': 'police_report_filed',
  'police report number': 'police_report_number',
  'police report #': 'police_report_number',
  'police_report_number': 'police_report_number',
  'claimant': 'claimant',
  'claimant name': 'claimant',
  'policy': 'policy',
  'policy number': 'policy',
  'accident description': 'accident_description',
  'accident_description': 'accident_description',
  'accident state': 'accident_state',
  'accident_state': 'accident_state',
  'loss street': 'loss_street_1',
  'loss street 1': 'loss_street_1',
  'loss address': 'loss_street_1',
  'loss_street_1': 'loss_street_1',
  'loss street 2': 'loss_street_2',
  'loss_street_2': 'loss_street_2',
  'loss city': 'loss_city',
  'loss_city': 'loss_city',
  'loss state': 'loss_state',
  'loss_state': 'loss_state',
  'loss postal code': 'loss_postal_code',
  'loss zip': 'loss_postal_code',
  'loss_postal_code': 'loss_postal_code',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
}

const INCIDENTS_CURRENCY_FIELDS = new Set()
const INCIDENTS_DATE_FIELDS = new Set(['loss_date', 'report_date'])
const INCIDENTS_BOOLEAN_FIELDS = new Set(['incident_only', 'injuries_reported', 'police_report_filed'])
const INCIDENTS_PREVIEW_COLUMNS = [
  'incident_type', 'incident_details', 'property_name', 'loss_date', 'report_date',
  'status', 'claimant', 'cause_of_loss', 'reported_by', 'event_description'
]
const INCIDENTS_HEADER_HINT = 'Incident Type, Incident Details, Property Name, Loss Date, Report Date, Status, Claimant, Cause of Loss, Reported By, Event Description, Accident Description, Loss Address, Loss City, Loss State, Notes'

// ─── SOV/Locations Header Map ───────────────────────────────────────────────

const SOV_HEADER_MAP = {
  'location name': 'location_name',
  'company': 'company',
  'entity name': 'entity_name',
  'street address': 'street_address',
  'address': 'street_address',
  'city': 'city',
  'state': 'state',
  'zip': 'zip',
  'zip code': 'zip',
  'zipcode': 'zip',
  'county': 'county',
  'full address': 'full_address',
  'latitude': 'latitude',
  'longitude': 'longitude',
  'region': 'region',
  'region (from state)': 'region',
  '# of bldgs': 'num_buildings',
  'number of bldgs': 'num_buildings',
  'num buildings': 'num_buildings',
  'buildings': 'num_buildings',
  '# of units': 'num_units',
  'number of units': 'num_units',
  'num units': 'num_units',
  'units': 'num_units',
  'square footage': 'square_footage',
  'sq ft': 'square_footage',
  'sqft': 'square_footage',
  '# of stories': 'num_stories',
  'number of stories': 'num_stories',
  'stories': 'num_stories',
  'iso const': 'iso_const',
  'iso construction': 'iso_const',
  'construction description': 'construction_description',
  'construction': 'construction_description',
  'orig year built': 'orig_year_built',
  'year built': 'orig_year_built',
  'yr built': 'orig_year_built',
  'yr bldg updated': 'yr_bldg_updated',
  'yr bldg updated (mand if >25 yrs)': 'yr_bldg_updated',
  'occupancy': 'occupancy',
  'percent sprinklered': 'percent_sprinklered',
  'iso prot class': 'iso_prot_class',
  'sprinklered (y/n)': 'sprinklered',
  'sprinklered': 'sprinklered',
  'real property value': 'real_property_value',
  'personal property value': 'personal_property_value',
  'other value $': 'other_value',
  'other value': 'other_value',
  "other value $ (outdoor prop & eqpt must be sch'd)": 'other_value',
  'bi/rental income': 'bi_rental_income',
  'bi rental income': 'bi_rental_income',
  'total tiv': 'total_tiv',
  'tiv': 'total_tiv',
  'deductible': 'deductible',
  'nws deductible': 'nws_deductible',
  'wind/hail deductible': 'wind_hail_deductible',
  'self insured retention': 'self_insured_retention',
  'flood zone': 'flood_zone',
  'is prop within 1000 ft of saltwater': 'is_prop_within_1000ft_saltwater',
  'is prop within 1000ft saltwater': 'is_prop_within_1000ft_saltwater',
  'tier 1 wind': 'tier_1_wind',
  'coastal flooding': 'coastal_flooding',
  'earthquake': 'earthquake',
  'wildfire': 'wildfire',
  'tornado': 'tornado',
  'strong wind': 'strong_wind',
  'lenders': 'lenders',
  'coverage': 'coverage',
  'policy': 'policy',
  'epi': 'epi',
  'status': 'status',
  'date sold': 'date_sold',
}

const SOV_CURRENCY_FIELDS = new Set([
  'real_property_value', 'personal_property_value', 'other_value',
  'bi_rental_income', 'total_tiv', 'deductible', 'nws_deductible',
  'wind_hail_deductible', 'self_insured_retention',
])
const SOV_NUMBER_FIELDS = new Set([
  'num_buildings', 'num_units', 'square_footage', 'num_stories',
  'latitude', 'longitude',
])
const SOV_DATE_FIELDS = new Set(['date_sold'])
const SOV_PREVIEW_COLUMNS = [
  'location_name', 'entity_name', 'street_address', 'city', 'state', 'zip',
  'num_buildings', 'num_units', 'square_footage',
  'real_property_value', 'personal_property_value', 'total_tiv',
  'construction_description', 'occupancy'
]
const SOV_HEADER_HINT = 'Location Name, Entity Name, Street Address, City, State, Zip, County, # of Bldgs, # of Units, Square Footage, # of Stories, ISO Const, Construction Description, Year Built, Real Property Value, Personal Property Value, Other Value, BI/Rental Income, Total TIV, Occupancy, Flood Zone'

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseCurrency(value) {
  if (!value) return null
  const cleaned = String(value).replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseNumber(value) {
  if (!value) return null
  const cleaned = String(value).replace(/[,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseDate(value) {
  if (!value) return null
  const str = String(value).trim()
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return null
}

function parseBoolean(value) {
  if (!value) return false
  const str = String(value).trim().toLowerCase()
  return ['true', 'yes', 'y', '1'].includes(str)
}

// Normalize claims status: OPEN, CLOSED, PENDING, DENIED
function normalizeClaimsStatus(value) {
  if (!value) return 'OPEN'
  const upper = String(value).trim().toUpperCase()
  if (['OPEN', 'CLOSED', 'PENDING', 'DENIED'].includes(upper)) return upper
  if (upper === 'CLOSE' || upper === 'CL') return 'CLOSED'
  if (upper === 'DENY') return 'DENIED'
  if (upper === 'PEND') return 'PENDING'
  return 'OPEN'
}

// Normalize incidents status: OPEN, CLOSED, PENDING, UNDER_REVIEW
function normalizeIncidentsStatus(value) {
  if (!value) return 'OPEN'
  const upper = String(value).trim().toUpperCase().replace(/\s+/g, '_')
  if (['OPEN', 'CLOSED', 'PENDING', 'UNDER_REVIEW'].includes(upper)) return upper
  if (upper === 'CLOSE' || upper === 'CL') return 'CLOSED'
  if (upper === 'PEND') return 'PENDING'
  if (upper === 'REVIEW' || upper === 'IN_REVIEW' || upper === 'UNDERREVIEW') return 'UNDER_REVIEW'
  return 'OPEN'
}

// ─── Config getter by upload type ───────────────────────────────────────────

function getConfig(uploadType) {
  switch (uploadType) {
    case 'claims':
      return {
        headerMap: CLAIMS_HEADER_MAP,
        currencyFields: CLAIMS_CURRENCY_FIELDS,
        numberFields: new Set(),
        dateFields: CLAIMS_DATE_FIELDS,
        booleanFields: new Set(),
        previewColumns: CLAIMS_PREVIEW_COLUMNS,
        headerHint: CLAIMS_HEADER_HINT,
        normalizeStatus: normalizeClaimsStatus,
        entityLabel: 'claim',
      }
    case 'incidents':
      return {
        headerMap: INCIDENTS_HEADER_MAP,
        currencyFields: INCIDENTS_CURRENCY_FIELDS,
        numberFields: new Set(),
        dateFields: INCIDENTS_DATE_FIELDS,
        booleanFields: INCIDENTS_BOOLEAN_FIELDS,
        previewColumns: INCIDENTS_PREVIEW_COLUMNS,
        headerHint: INCIDENTS_HEADER_HINT,
        normalizeStatus: normalizeIncidentsStatus,
        entityLabel: 'incident',
      }
    case 'sov':
      return {
        headerMap: SOV_HEADER_MAP,
        currencyFields: SOV_CURRENCY_FIELDS,
        numberFields: SOV_NUMBER_FIELDS,
        dateFields: SOV_DATE_FIELDS,
        booleanFields: new Set(),
        previewColumns: SOV_PREVIEW_COLUMNS,
        headerHint: SOV_HEADER_HINT,
        normalizeStatus: null,
        entityLabel: 'location',
      }
    default:
      return null
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const { clients, isLoading: clientsLoading } = useClients(profile?.organization_id)

  // Step tracking: 1 = select type, 2 = select client + paste, 3 = previewing
  const [step, setStep] = useState(1)
  const [uploadType, setUploadType] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [pasteData, setPasteData] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [headerMap, setHeaderMap] = useState([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const config = getConfig(uploadType)
  const typeConfig = UPLOAD_TYPES.find(t => t.key === uploadType)

  // Filter clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients
    const search = clientSearch.toLowerCase()
    return clients.filter(c => c.name?.toLowerCase().includes(search))
  }, [clients, clientSearch])

  const selectedClient = clients.find(c => c.id === selectedClientId)

  // Get unique mapped columns that have data
  const activeColumns = useMemo(() => {
    if (parsedRows.length === 0 || !config) return []
    const keys = new Set()
    parsedRows.forEach(row => Object.keys(row).forEach(k => keys.add(k)))
    const ordered = config.previewColumns.filter(k => keys.has(k))
    keys.forEach(k => { if (!ordered.includes(k)) ordered.push(k) })
    return ordered
  }, [parsedRows, config])

  // Parse pasted data into rows
  const handlePreview = () => {
    if (!pasteData.trim() || !config) return

    const normalizedData = pasteData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rows = normalizedData.split('\n').filter(row => row.trim())

    if (rows.length === 0) return

    const firstRowCells = rows[0].split('\t')
    const possibleHeaders = firstRowCells.map(h => h.toLowerCase().trim().replace(/"/g, ''))

    // Check if first row looks like headers
    let matchCount = 0
    possibleHeaders.forEach(h => {
      if (config.headerMap[h]) matchCount++
    })

    let dataRows, mappedHeaders
    if (matchCount >= Math.max(1, firstRowCells.length * 0.3)) {
      mappedHeaders = possibleHeaders.map(h => config.headerMap[h] || null)
      dataRows = rows.slice(1)
    } else {
      mappedHeaders = config.previewColumns.slice(0, firstRowCells.length)
      dataRows = rows
    }

    setHeaderMap(mappedHeaders)

    // Parse each data row
    const parsed = dataRows.map(row => {
      const cells = row.split('\t')
      const record = {}

      cells.forEach((cell, index) => {
        const key = mappedHeaders[index]
        if (!key) return

        let value = cell.trim().replace(/^"|"$/g, '')
        if (!value) return

        if (config.currencyFields.has(key)) {
          value = parseCurrency(value)
        } else if (config.numberFields.has(key)) {
          value = parseNumber(value)
        } else if (config.dateFields.has(key)) {
          value = parseDate(value)
        } else if (config.booleanFields.has(key)) {
          value = parseBoolean(value)
        } else if (key === 'status' && config.normalizeStatus) {
          value = config.normalizeStatus(value)
        }

        if (value !== null && value !== '') {
          record[key] = value
        }
      })

      return record
    }).filter(r => Object.keys(r).length > 0)

    setParsedRows(parsed)
    setStep(3)
  }

  // Bulk insert parsed rows
  const handleImport = async () => {
    if (parsedRows.length === 0 || !selectedClientId || !typeConfig) return

    setSaving(true)
    try {
      const rowsToInsert = parsedRows.map(row => ({
        ...row,
        client_id: selectedClientId,
        organization_id: profile.organization_id,
        created_by: user.id,
      }))

      console.log(`Inserting ${typeConfig.label}:`, JSON.stringify(rowsToInsert[0], null, 2))

      const { data, error } = await supabase
        .from(typeConfig.table)
        .insert(rowsToInsert)
        .select('id')

      if (error) {
        console.error('Supabase error:', JSON.stringify(error))
        throw new Error(error.message || error.details || error.hint || 'Unknown database error')
      }

      setResult({
        success: true,
        count: data.length,
        clientId: selectedClientId,
        clientName: selectedClient?.name,
        type: uploadType,
      })

      // Reset form
      setPasteData('')
      setParsedRows([])
      setStep(1)
      setUploadType('')
    } catch (error) {
      console.error(`Error importing ${typeConfig.label}:`, error)
      setResult({ success: false, message: error.message })
    } finally {
      setSaving(false)
    }
  }

  // Reset to start over
  const handleReset = () => {
    setPasteData('')
    setParsedRows([])
    setHeaderMap([])
    setStep(1)
    setUploadType('')
    setSelectedClientId('')
    setClientSearch('')
    setResult(null)
  }

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mass Upload</h1>
          <p className="text-gray-600 mt-1">Bulk import data from Excel spreadsheets</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[
            { num: 1, label: 'Select Type' },
            { num: 2, label: 'Client & Data' },
            { num: 3, label: 'Preview & Import' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step >= s.num
                  ? 'bg-[#006B7D] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {step > s.num ? '✓' : s.num}
                </span>
                {s.label}
              </div>
              {i < 2 && (
                <div className={`w-8 h-0.5 ${step > s.num ? 'bg-[#006B7D]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Success Result */}
        {result?.success && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-green-800">
                Successfully imported {result.count} {result.type === 'sov' ? 'location' : result.type === 'claims' ? 'claim' : 'incident'}{result.count !== 1 ? 's' : ''}!
              </h3>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/clients/${result.clientId}?tab=${UPLOAD_TYPES.find(t => t.key === result.type)?.successTab || 'locations'}`)}
                className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors"
              >
                View {result.clientName}'s {result.type === 'sov' ? 'Locations' : result.type === 'claims' ? 'Claims' : 'Incidents'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              >
                Upload More
              </button>
            </div>
          </div>
        )}

        {/* Error Result */}
        {result && !result.success && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 font-medium">Import failed: {result.message}</p>
            <button
              onClick={() => setResult(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!result?.success && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

            {/* ── Step 1: Select Upload Type ── */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">What are you uploading?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {UPLOAD_TYPES.map(type => (
                    <button
                      key={type.key}
                      onClick={() => setUploadType(type.key)}
                      className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                        uploadType === type.key
                          ? 'border-[#006B7D] bg-[#006B7D]/5 ring-1 ring-[#006B7D]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`mb-3 ${uploadType === type.key ? 'text-[#006B7D]' : 'text-gray-400'}`}>
                        {type.icon}
                      </div>
                      <h3 className={`font-semibold text-lg ${uploadType === type.key ? 'text-[#006B7D]' : 'text-gray-900'}`}>
                        {type.label}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!uploadType}
                    className="px-6 py-2.5 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Select Client & Paste Data ── */}
            {step === 2 && config && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setStep(1)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Upload {typeConfig?.label}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-[#006B7D]/10 text-[#006B7D] rounded-full text-xs font-medium">
                    {typeConfig?.label}
                  </span>
                </div>

                {/* Select Client */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Client
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      value={selectedClient ? selectedClient.name : clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value)
                        if (selectedClientId) setSelectedClientId('')
                      }}
                      onFocus={() => {
                        if (selectedClientId) {
                          setClientSearch(selectedClient?.name || '')
                          setSelectedClientId('')
                        }
                      }}
                      placeholder={clientsLoading ? 'Loading clients...' : 'Search for a client...'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900"
                    />
                    {!selectedClientId && clientSearch && filteredClients.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto z-10">
                        {filteredClients.slice(0, 20).map(client => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setSelectedClientId(client.id)
                              setClientSearch('')
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-900 text-sm"
                          >
                            {client.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedClient && (
                    <p className="mt-2 text-sm text-green-700 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {selectedClient.name}
                    </p>
                  )}
                </div>

                {/* Paste Data */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Paste Excel Data
                  </label>
                  <textarea
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    disabled={!selectedClientId}
                    placeholder={selectedClientId
                      ? `1. Open your Excel file\n2. Select the rows you want to import (include header row)\n3. Press Ctrl+C to copy\n4. Click here and press Ctrl+V to paste`
                      : 'Select a client first...'
                    }
                    className="w-full h-40 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-[#006B7D] focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                  />

                  {/* Paste stats */}
                  {pasteData.trim() && (() => {
                    const rows = pasteData.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(r => r.trim())
                    const cols = rows[0]?.split('\t').length || 0
                    return (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        Detected <strong>{rows.length - 1}</strong> data row(s) with <strong>{cols}</strong> columns.
                        Click Preview to continue.
                      </div>
                    )
                  })()}

                  {/* Supported headers hint */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-1">Supported Excel Headers for {typeConfig?.label}:</p>
                    <p className="text-xs text-gray-500">{config.headerHint}</p>
                  </div>
                </div>

                {/* Preview button */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={!pasteData.trim() || !selectedClientId}
                    className="px-6 py-2.5 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview Data
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Preview & Import ── */}
            {step === 3 && config && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setStep(2)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Preview — {parsedRows.length} {config.entityLabel}{parsedRows.length !== 1 ? 's' : ''} ready to import
                  </h2>
                  <span className="px-2.5 py-0.5 bg-[#006B7D]/10 text-[#006B7D] rounded-full text-xs font-medium">
                    {typeConfig?.label}
                  </span>
                  <span className="text-sm text-gray-500">→ {selectedClient?.name}</span>
                </div>

                {parsedRows.length > 0 ? (
                  <>
                    <div className="border border-gray-200 rounded-lg overflow-auto max-h-96 mb-6">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b">#</th>
                            {activeColumns.map(col => (
                              <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b whitespace-nowrap">
                                {col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.slice(0, 1000).map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 text-gray-400 border-b">{i + 1}</td>
                              {activeColumns.map(col => (
                                <td key={col} className="px-3 py-2 text-gray-900 border-b whitespace-nowrap max-w-xs truncate">
                                  {(config.currencyFields.has(col) || SOV_CURRENCY_FIELDS.has(col)) && row[col] != null
                                    ? `$${Number(row[col]).toLocaleString()}`
                                    : typeof row[col] === 'boolean'
                                      ? (row[col] ? 'Yes' : 'No')
                                      : row[col] || <span className="text-gray-300">-</span>
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedRows.length > 1000 && (
                        <div className="p-3 bg-gray-50 text-center text-sm text-gray-500 border-t">
                          Showing first 1,000 of {parsedRows.length} rows
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setStep(2)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                      >
                        Back
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={handleReset}
                          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          Start Over
                        </button>
                        <button
                          onClick={handleImport}
                          disabled={saving}
                          className="px-6 py-2.5 bg-[#006B7D] hover:bg-[#008BA3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Importing...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Import {parsedRows.length} {typeConfig?.label}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">No valid data found.</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Make sure your Excel data has a header row with recognized column names.
                    </p>
                    <button
                      onClick={() => setStep(2)}
                      className="mt-3 text-sm text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Go back and try again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
