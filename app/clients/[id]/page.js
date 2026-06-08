'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import LocationsTable from '@/components/LocationsTable'

import OrigamiIncidentsTable from '@/components/OrigamiIncidentsTable'
import OrigamiClaimsTable from '@/components/OrigamiClaimsTable'
import OrigamiPoliciesTable from '@/components/OrigamiPoliciesTable'
import CommentSidebar from '@/components/CommentSidebar'
import TasksSection from '@/components/TasksSection'
import { useClient, useLocations, trackClientView } from '@/hooks'

// Function to generate initials from company name
function getInitials(name) {
  if (!name) return '?'
  const words = name.split(' ')
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return words
    .slice(0, 3)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

// Function to generate a color based on the name
function getColorFromName(name) {
  const colors = [
    'bg-teal-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-green-600',
    'bg-red-600',
    'bg-orange-600',
    'bg-pink-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('origami-claims')
  const [users, setUsers] = useState([])
  const [lossAverages, setLossAverages] = useState(null)
  const [origamiClaims, setOrigamiClaims] = useState([])
  const [origamiPolicies, setOrigamiPolicies] = useState([])
  const [origamiIncidents, setOrigamiIncidents] = useState([])
  const [origamiLoading, setOrigamiLoading] = useState(false)
  const [origamiFetched, setOrigamiFetched] = useState(false)
  const [origamiClientIds, setOrigamiClientIds] = useState([])
  const [origamiLocations, setOrigamiLocations] = useState([])
  const [showNewClaimModal, setShowNewClaimModal] = useState(false)
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false)
  const [newClaimForm, setNewClaimForm] = useState({ claimant: '', loss_date: '', loss_description: '', location_id: '', claim_number: '' })
  const [newIncidentForm, setNewIncidentForm] = useState({ claimant: '', loss_date: '', loss_description: '', event_description: '', location_id: '' })
  const [creatingClaim, setCreatingClaim] = useState(false)
  const [creatingIncident, setCreatingIncident] = useState(false)
  const [matchOrigamiLoc, setMatchOrigamiLoc] = useState(null) // origami location being matched
  const [matchTargetAppId, setMatchTargetAppId] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState(null)

  const handleMatchLocation = async () => {
    if (!matchOrigamiLoc || !matchTargetAppId) return
    setMatching(true)
    setMatchError(null)
    try {
      const res = await fetch('/api/origami/confirm-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'location',
          organizationId: profile.organization_id,
          userId: profile.id,
          matches: [{
            origami_location_id: matchOrigamiLoc.location_id,
            app_location_id: matchTargetAppId,
            confidence_score: 1.0,
            match_reasoning: 'Manual match via FSIS UI',
          }],
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to match')
      // Drop the just-matched origami location from the local list so the user
      // sees it disappear immediately
      setOrigamiLocations(prev => prev.filter(l => l.location_id !== matchOrigamiLoc.location_id))
      setMatchOrigamiLoc(null)
      setMatchTargetAppId('')
    } catch (e) {
      setMatchError(e.message)
    } finally {
      setMatching(false)
    }
  }

  // Check URL for tab param
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['locations', 'sold-locations', 'incidents', 'origami-claims', 'origami-policies'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Use SWR hooks for cached data fetching
  const { client, isLoading: clientLoading, isError: clientError } = useClient(params.id, profile?.organization_id)
  const { locations, isLoading: locationsLoading, refresh: refreshLocations } = useLocations(params.id, profile?.organization_id)

  // Filter locations by status - sold locations go to their own tab
  const activeLocations = locations.filter(loc => loc.status?.toLowerCase() !== 'sold')
  const soldLocations = locations.filter(loc => loc.status?.toLowerCase() === 'sold')

  // Track this client as recently viewed
  useEffect(() => {
    if (client && params.id) {
      trackClientView(params.id)
    }
  }, [client, params.id])

  // Fetch counts for tabs (fast - runs in parallel on initial load)
  const fetchCounts = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    try {
      // Fetch 5-year loss averages (lightweight query)
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
      const fiveYearCutoff = fiveYearsAgo.toISOString().split('T')[0]
      const { data: lossData } = await supabase
        .from('claims')
        .select('total_incurred, coverage, loss_date, report_date, location_id')
        .eq('organization_id', profile.organization_id)
        .eq('client_id', params.id)

      if (lossData) {
        let propTotal = 0
        let glTotal = 0
        const propLocations = new Set()
        const glLocations = new Set()
        lossData.forEach(c => {
          const claimDate = c.loss_date || c.report_date
          if (!claimDate || claimDate < fiveYearCutoff) return
          const cov = (c.coverage || '').toLowerCase()
          const incurred = Number(c.total_incurred) || 0
          if (cov.includes('property')) {
            propTotal += incurred
            if (c.location_id) propLocations.add(c.location_id)
          } else if (cov.includes('general liability') || cov.includes('liability') || cov === 'gl') {
            glTotal += incurred
            if (c.location_id) glLocations.add(c.location_id)
          }
        })
        setLossAverages({
          propertyAAL: propTotal / 5,
          glAAL: glTotal / 5,
          propertyTotal: propTotal,
          glTotal: glTotal,
          propertyPerLoc: propLocations.size ? propTotal / propLocations.size : 0,
          glPerLoc: glLocations.size ? glTotal / glLocations.size : 0,
        })
      }
    } catch (error) {
      console.error('Error fetching counts:', error)
    }
  }, [profile?.organization_id, params.id])

  // Fetch origami claims, policies, and incidents
  const fetchOrigamiData = useCallback(async () => {
    if (!profile?.organization_id || !params.id || origamiFetched) return

    setOrigamiLoading(true)
    try {
      const res = await fetch('/api/origami/client-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appClientId: params.id, organizationId: profile.organization_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrigamiClaims(data.claims || [])
      setOrigamiPolicies(data.policies || [])
      setOrigamiIncidents(data.incidents || [])
      setOrigamiClientIds(data.origamiClientIds || [])
      setOrigamiLocations(data.origamiLocations || [])
      setOrigamiFetched(true)
    } catch (error) {
      console.error('Error fetching origami data:', error)
    } finally {
      setOrigamiLoading(false)
    }
  }, [profile?.organization_id, params.id, origamiFetched])

  // Fetch origami data on initial load (claims is now the default tab)
  useEffect(() => {
    if (user && profile && !origamiFetched) {
      fetchOrigamiData()
    }
  }, [user, profile, origamiFetched, fetchOrigamiData])

  // Fetch counts on initial load (fast)
  useEffect(() => {
    if (user && profile) {
      fetchCounts()
    }
  }, [user, profile, fetchCounts])

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

  // Fetch origami data when tab needs it
  useEffect(() => {
    if ((activeTab === 'origami-claims' || activeTab === 'origami-policies' || activeTab === 'incidents') && user && profile && !origamiFetched) {
      fetchOrigamiData()
    }
  }, [activeTab, user, profile, origamiFetched, fetchOrigamiData])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Show loading while auth loads, profile loads, or client loads
  if (authLoading || !profile || clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading client...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (clientError || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-600 font-medium">
              {clientError ? `Error: ${clientError.message}` : 'Client not found'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Client ID: {params.id} | Org ID: {profile?.organization_id || 'none'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  const handleCreateClaim = async () => {
    if (!newClaimForm.claimant) return alert('Claimant name is required')
    setCreatingClaim(true)
    try {
      const res = await fetch('/api/origami/create-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newClaimForm, client_id: origamiClientIds[0] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowNewClaimModal(false)
      setNewClaimForm({ claimant: '', loss_date: '', loss_description: '', location_id: '', claim_number: '' })
      router.push(`/origami/claims/${data.claim.claim_id}`)
    } catch (err) {
      alert('Failed to create claim: ' + err.message)
    } finally {
      setCreatingClaim(false)
    }
  }

  const handleCreateIncident = async () => {
    if (!newIncidentForm.claimant) return alert('Claimant name is required')
    setCreatingIncident(true)
    try {
      const res = await fetch('/api/origami/create-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newIncidentForm, client_id: origamiClientIds[0] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowNewIncidentModal(false)
      setNewIncidentForm({ claimant: '', loss_date: '', loss_description: '', event_description: '', location_id: '' })
      router.push(`/origami/incidents/${data.incident.incident_id}`)
    } catch (err) {
      alert('Failed to create incident: ' + err.message)
    } finally {
      setCreatingIncident(false)
    }
  }

  const initials = getInitials(client.name)
  const bgColor = getColorFromName(client.name)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      {/* Comment Sidebar */}
      <CommentSidebar
        entityType="client"
        entityId={params.id}
        organizationId={profile.organization_id}
        entityName={client.name || 'Client'}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
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

        {/* Unlinked client banner */}
        {origamiFetched && origamiClientIds.length === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2 text-sm text-amber-900">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Client not linked to cert generator.</p>
                <p className="mt-0.5 text-amber-800">Values may not be up to date — claims, policies, and incidents will be empty until this client is matched.</p>
              </div>
            </div>
          </div>
        )}

        {/* Client Card */}
        <div className="bg-white rounded-3xl shadow-md p-8 mb-6">
          {/* Logo and Client Details */}
          <div className="flex items-start gap-8">
            {/* Logo/Initials */}
            {client.logo_url ? (
              <div className="w-44 h-44 flex items-center justify-center bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 p-3">
                <img
                  src={client.logo_url}
                  alt={`${client.name} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className={`${bgColor} w-44 h-44 flex items-center justify-center text-white text-4xl font-bold rounded-2xl shadow-md flex-shrink-0`}>
                {initials}
              </div>
            )}

            {/* Name and Details */}
            <div className="flex-1 space-y-2 text-sm">
              <h1 className="text-3xl font-semibold text-gray-900 mb-3">{client.name}</h1>
              {client.account_manager && (
                <p className="text-gray-600 -mt-2 mb-3">{client.account_manager}</p>
              )}
              {client.street_address && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">Street Address</div>
                  <div className="text-gray-900">{client.street_address}</div>
                </div>
              )}
              {client.secondary_address && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">Secondary Address</div>
                  <div className="text-gray-900">{client.secondary_address}</div>
                </div>
              )}
              {(client.city || client.state) && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">City / State</div>
                  <div className="text-gray-900 flex items-center gap-2">
                    {client.city && <span>{client.city}</span>}
                    {client.state && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-[#006B7D] text-white font-semibold rounded-full text-xs">
                        {client.state}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">Contact Email</div>
                  <div>
                    <a href={`mailto:${client.email}`} className="text-[#006B7D] hover:text-[#008BA3] flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {client.email}
                    </a>
                  </div>
                </div>
              )}
              {client.producer_name && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">Contact</div>
                  <div className="text-gray-900">{client.producer_name}</div>
                </div>
              )}
              {client.ams_code && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">AMS Code</div>
                  <div className="text-gray-900">{client.ams_code}</div>
                </div>
              )}
              {client.client_number && (
                <div className="flex">
                  <div className="w-40 font-medium text-gray-500">Client Number</div>
                  <div className="text-gray-900">{client.client_number}</div>
                </div>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push(`/clients/${client.id}/edit`)}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Tasks Section */}
        <TasksSection
          clientId={params.id}
          clientName={client.name}
          organizationId={profile.organization_id}
          userId={user.id}
          users={users}
        />

        {/* Tabs Section */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('origami-claims')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'origami-claims'
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
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {origamiClaims.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'incidents'
                    ? 'border-[#006B7D] text-[#006B7D]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Incidents
                  {origamiFetched && (
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {origamiIncidents.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('origami-policies')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'origami-policies'
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
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {origamiPolicies.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('locations')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'locations'
                    ? 'border-[#006B7D] text-[#006B7D]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Locations
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {activeLocations.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sold-locations')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'sold-locations'
                    ? 'border-[#006B7D] text-[#006B7D]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Sold Locations
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {soldLocations.length}
                  </span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'incidents' && (
              <>
                {origamiLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading incidents...</p>
                  </div>
                ) : (
                  <OrigamiIncidentsTable
                    incidents={origamiIncidents}
                    onNewIncident={origamiClientIds.length > 0 ? () => setShowNewIncidentModal(true) : undefined}
                  />
                )}
              </>
            )}

            {activeTab === 'locations' && (
              <>
                {locationsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading locations...</p>
                  </div>
                ) : activeLocations.length > 0 ? (
                  <LocationsTable
                    locations={activeLocations}
                    clientId={params.id}
                    organizationId={profile.organization_id}
                    onRefresh={refreshLocations}
                  />
                ) : null}

                {/* Origami Locations — always show so loss summaries can be
                    printed for locations not yet linked to the app */}
                {origamiLocations.length > 0 && (
                  <div className={activeLocations.length > 0 ? 'mt-6' : ''}>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Origami Locations ({origamiLocations.length})
                    </h4>
                    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                      {origamiLocations.map(loc => (
                        <div key={loc.location_id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                          <a
                            href={`/origami/locations/${loc.location_id}`}
                            className="flex-1 min-w-0 cursor-pointer pr-3"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">{loc.description || loc.street1 || `Location ${loc.location_id}`}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {[loc.street1, loc.city, loc.state_id, loc.postal_code].filter(Boolean).join(', ')}
                            </p>
                          </a>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400">#{loc.display_code || loc.location_id}</span>
                            {activeLocations.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setMatchOrigamiLoc(loc)
                                  setMatchTargetAppId('')
                                  setMatchError(null)
                                }}
                                className="px-2 py-1 text-xs font-medium text-[#006B7D] hover:bg-[#006B7D]/10 border border-[#006B7D]/30 rounded transition-colors"
                                title="Link this Origami location to an app location"
                              >
                                Match
                              </button>
                            )}
                            <a href={`/origami/locations/${loc.location_id}`} className="text-gray-300">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Match Location Modal */}
                    {matchOrigamiLoc && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMatchOrigamiLoc(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Match Origami Location</h2>
                            <button onClick={() => setMatchOrigamiLoc(null)} className="text-gray-400 hover:text-gray-600">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="px-6 py-4 flex-1 overflow-y-auto">
                            <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Origami location</p>
                              <p className="text-sm font-medium text-gray-900">{matchOrigamiLoc.description || matchOrigamiLoc.street1 || 'Location ' + matchOrigamiLoc.location_id}</p>
                              <p className="text-xs text-gray-500">
                                {[matchOrigamiLoc.street1, matchOrigamiLoc.city, matchOrigamiLoc.state_id, matchOrigamiLoc.postal_code].filter(Boolean).join(', ')}
                              </p>
                            </div>

                            <p className="text-sm text-gray-600 mb-2">Pick the app location to link this to:</p>

                            {matchError && (
                              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{matchError}</div>
                            )}

                            <div className="space-y-1">
                              {activeLocations.map(al => {
                                const selected = matchTargetAppId === al.id
                                return (
                                  <label
                                    key={al.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${selected ? 'bg-[#006B7D]/5 border-[#006B7D]/40' : 'bg-white border-gray-200 hover:border-[#006B7D]/30'}`}
                                  >
                                    <input
                                      type="radio"
                                      name="match-target"
                                      className="mt-1 accent-[#006B7D]"
                                      checked={selected}
                                      onChange={() => setMatchTargetAppId(al.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {al.location_name || al.entity_name || 'Unnamed Location'}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {[al.street_address, al.city, al.state, al.zip].filter(Boolean).join(', ') || '—'}
                                      </div>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
                            <button
                              onClick={() => setMatchOrigamiLoc(null)}
                              disabled={matching}
                              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleMatchLocation}
                              disabled={matching || !matchTargetAppId}
                              className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {matching ? 'Matching…' : 'Match'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'sold-locations' && (
              <>
                {locationsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading sold locations...</p>
                  </div>
                ) : (
                  <LocationsTable
                    locations={soldLocations}
                    clientId={params.id}
                    organizationId={profile.organization_id}
                    onRefresh={refreshLocations}
                  />
                )}
              </>
            )}

            {activeTab === 'origami-claims' && (
              <>
                {origamiLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading claims...</p>
                  </div>
                ) : (
                  <OrigamiClaimsTable
                    claims={origamiClaims}
                    onNewClaim={origamiClientIds.length > 0 ? () => setShowNewClaimModal(true) : undefined}
                  />
                )}
              </>
            )}

            {activeTab === 'origami-policies' && (
              <>
                {origamiLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading policies...</p>
                  </div>
                ) : (
                  <OrigamiPoliciesTable policies={origamiPolicies} />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* New Claim Modal */}
      {showNewClaimModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">New Claim</h3>
              <button onClick={() => setShowNewClaimModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claimant *</label>
                <input
                  type="text"
                  value={newClaimForm.claimant}
                  onChange={(e) => setNewClaimForm(p => ({ ...p, claimant: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                  placeholder="Claimant name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
                <input
                  type="text"
                  value={newClaimForm.claim_number}
                  onChange={(e) => setNewClaimForm(p => ({ ...p, claim_number: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                  placeholder="Auto-generated if blank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Date</label>
                <input
                  type="date"
                  value={newClaimForm.loss_date}
                  onChange={(e) => setNewClaimForm(p => ({ ...p, loss_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={newClaimForm.location_id}
                  onChange={(e) => setNewClaimForm(p => ({ ...p, location_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900 bg-white"
                >
                  <option value="">— Select Location —</option>
                  {origamiLocations.map(l => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.description || l.street1 || `Location ${l.location_id}`}{l.city ? ` — ${l.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Description</label>
                <textarea
                  value={newClaimForm.loss_description}
                  onChange={(e) => setNewClaimForm(p => ({ ...p, loss_description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                  placeholder="Describe the loss..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowNewClaimModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClaim}
                disabled={creatingClaim || !newClaimForm.claimant}
                className="px-4 py-2 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg disabled:opacity-50"
              >
                {creatingClaim ? 'Creating...' : 'Create Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Incident Modal */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">New Incident</h3>
              <button onClick={() => setShowNewIncidentModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claimant *</label>
                <input
                  type="text"
                  value={newIncidentForm.claimant}
                  onChange={(e) => setNewIncidentForm(p => ({ ...p, claimant: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                  placeholder="Claimant name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Date</label>
                <input
                  type="date"
                  value={newIncidentForm.loss_date}
                  onChange={(e) => setNewIncidentForm(p => ({ ...p, loss_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={newIncidentForm.location_id}
                  onChange={(e) => setNewIncidentForm(p => ({ ...p, location_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900 bg-white"
                >
                  <option value="">— Select Location —</option>
                  {origamiLocations.map(l => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.description || l.street1 || `Location ${l.location_id}`}{l.city ? ` — ${l.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
                <textarea
                  value={newIncidentForm.event_description}
                  onChange={(e) => setNewIncidentForm(p => ({ ...p, event_description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                  placeholder="What happened..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loss Description</label>
                <textarea
                  value={newIncidentForm.loss_description}
                  onChange={(e) => setNewIncidentForm(p => ({ ...p, loss_description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B7D] text-gray-900"
                  placeholder="Describe the loss..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIncident}
                disabled={creatingIncident || !newIncidentForm.claimant}
                className="px-4 py-2 text-sm text-white bg-[#006B7D] hover:bg-[#008BA3] rounded-lg disabled:opacity-50"
              >
                {creatingIncident ? 'Creating...' : 'Create Incident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
