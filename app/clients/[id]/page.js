'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import LocationsTable from '@/components/LocationsTable'
import PoliciesTable from '@/components/PoliciesTable'
import ClaimsTable from '@/components/ClaimsTable'
import IncidentsTable from '@/components/IncidentsTable'
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
  const [claims, setClaims] = useState([])
  const [claimsCount, setClaimsCount] = useState(0)
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [claimsFetched, setClaimsFetched] = useState(false)
  const [incidents, setIncidents] = useState([])
  const [incidentsCount, setIncidentsCount] = useState(0)
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [incidentsFetched, setIncidentsFetched] = useState(false)
  const [policies, setPolicies] = useState([])
  const [policiesCount, setPoliciesCount] = useState(0)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [policiesFetched, setPoliciesFetched] = useState(false)
  const [activeTab, setActiveTab] = useState('locations')
  const [users, setUsers] = useState([])

  // Check URL for tab param
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['locations', 'policies', 'claims', 'incidents'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Use SWR hooks for cached data fetching
  const { client, isLoading: clientLoading, isError: clientError } = useClient(params.id, profile?.organization_id)
  const { locations, isLoading: locationsLoading, refresh: refreshLocations } = useLocations(params.id, profile?.organization_id)

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
      // Run all count queries in parallel for speed
      const [policiesResult, claimsResult, incidentsResult] = await Promise.all([
        supabase
          .from('policies')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('client_id', params.id),
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('client_id', params.id),
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('client_id', params.id)
      ])

      if (!policiesResult.error) setPoliciesCount(policiesResult.count || 0)
      if (!claimsResult.error) setClaimsCount(claimsResult.count || 0)
      if (!incidentsResult.error) setIncidentsCount(incidentsResult.count || 0)
    } catch (error) {
      console.error('Error fetching counts:', error)
    }
  }, [profile?.organization_id, params.id])

  // Fetch full claims data (only when claims tab is clicked)
  const fetchClaims = useCallback(async () => {
    if (!profile?.organization_id || !params.id || claimsFetched) return

    setClaimsLoading(true)
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('client_id', params.id)
        .order('report_date', { ascending: false })
        .limit(200)

      if (error) throw error
      setClaims(data || [])
      setClaimsFetched(true)
    } catch (error) {
      console.error('Error fetching claims:', error)
    } finally {
      setClaimsLoading(false)
    }
  }, [profile?.organization_id, params.id, claimsFetched])

  // Fetch full incidents data (only when incidents tab is clicked)
  const fetchIncidents = useCallback(async () => {
    if (!profile?.organization_id || !params.id || incidentsFetched) return

    setIncidentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          locations(location_name, company)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('client_id', params.id)
        .order('incident_number', { ascending: false })
        .limit(200)

      if (error) throw error
      setIncidents(data || [])
      setIncidentsFetched(true)
    } catch (error) {
      console.error('Error fetching incidents:', error)
    } finally {
      setIncidentsLoading(false)
    }
  }, [profile?.organization_id, params.id, incidentsFetched])

  // Fetch full policies data with linked locations (only when policies tab is clicked)
  const fetchPolicies = useCallback(async () => {
    if (!profile?.organization_id || !params.id || policiesFetched) return

    setPoliciesLoading(true)
    try {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          policy_locations(
            id,
            location_id,
            location_tiv,
            location_premium,
            location:locations(id, location_name, city, state, street_address)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('client_id', params.id)
        .order('expiration_date', { ascending: true })
        .limit(100)

      if (error) throw error
      setPolicies(data || [])
      setPoliciesFetched(true)
    } catch (error) {
      console.error('Error fetching policies:', error)
    } finally {
      setPoliciesLoading(false)
    }
  }, [profile?.organization_id, params.id, policiesFetched])

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

  // Fetch full data only when tab is clicked
  useEffect(() => {
    if (activeTab === 'policies' && user && profile && !policiesFetched) {
      fetchPolicies()
    }
    if (activeTab === 'claims' && user && profile && !claimsFetched) {
      fetchClaims()
    }
    if (activeTab === 'incidents' && user && profile && !incidentsFetched) {
      fetchIncidents()
    }
  }, [activeTab, user, profile, policiesFetched, claimsFetched, incidentsFetched, fetchPolicies, fetchClaims, fetchIncidents])

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

        {/* Client Card */}
        <div className="bg-white rounded-3xl shadow-md p-8 mb-6">
          {/* Logo and Name Section */}
          <div className="flex items-start gap-6 mb-8 pb-8 border-b border-gray-200">
            {/* Logo/Initials */}
            {client.logo_url ? (
              <div className="w-24 h-24 flex items-center justify-center bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                <img
                  src={client.logo_url}
                  alt={`${client.name} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className={`${bgColor} w-24 h-24 flex items-center justify-center text-white text-2xl font-bold rounded-2xl shadow-md flex-shrink-0`}>
                {initials}
              </div>
            )}

            {/* Name and Contact Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">{client.name}</h1>
              {client.account_manager && (
                <p className="text-gray-600">{client.account_manager}</p>
              )}
            </div>
          </div>

          {/* Client Details */}
          <div className="space-y-4">
            {client.street_address && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">Street Address</div>
                <div className="flex-1 text-gray-900">{client.street_address}</div>
              </div>
            )}

            {client.secondary_address && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">Secondary Address</div>
                <div className="flex-1 text-gray-900">{client.secondary_address}</div>
              </div>
            )}

            {client.city && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">City</div>
                <div className="flex-1 text-gray-900">{client.city}</div>
              </div>
            )}

            {client.state && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">State</div>
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 bg-[#006B7D] text-white font-semibold rounded-full text-xs">
                    {client.state}
                  </span>
                </div>
              </div>
            )}

            {client.email && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">Contact Email</div>
                <div className="flex-1">
                  <a
                    href={`mailto:${client.email}`}
                    className="text-[#006B7D] hover:text-[#008BA3] flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {client.email}
                  </a>
                </div>
              </div>
            )}

            {client.producer_name && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">Contact</div>
                <div className="flex-1 text-gray-900">{client.producer_name}</div>
              </div>
            )}

            {client.ams_code && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">AMS Code</div>
                <div className="flex-1 text-gray-900">{client.ams_code}</div>
              </div>
            )}

            {client.client_number && (
              <div className="flex">
                <div className="w-48 text-sm font-medium text-gray-600">Client Number</div>
                <div className="flex-1 text-gray-900">{client.client_number}</div>
              </div>
            )}
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
                    {locations.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
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
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {policiesFetched ? policies.length : policiesCount}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('claims')}
                className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
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
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {claimsFetched ? claims.length : claimsCount}
                  </span>
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
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {incidentsFetched ? incidents.length : incidentsCount}
                  </span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'locations' && (
              <>
                {locationsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading locations...</p>
                  </div>
                ) : (
                  <LocationsTable
                    locations={locations}
                    clientId={params.id}
                    organizationId={profile.organization_id}
                    onRefresh={refreshLocations}
                  />
                )}
              </>
            )}

            {activeTab === 'policies' && (
              <>
                {policiesLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading policies...</p>
                  </div>
                ) : (
                  <PoliciesTable
                    policies={policies}
                    clientId={params.id}
                    locations={locations}
                    onAddPolicy={() => router.push(`/clients/${params.id}/policies/add`)}
                  />
                )}
              </>
            )}

            {activeTab === 'claims' && (
              <>
                {claimsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading claims...</p>
                  </div>
                ) : (
                  <ClaimsTable
                    claims={claims}
                    clientId={params.id}
                  />
                )}
              </>
            )}

            {activeTab === 'incidents' && (
              <>
                {incidentsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006B7D]"></div>
                    <p className="mt-2 text-gray-600">Loading incidents...</p>
                  </div>
                ) : (
                  <IncidentsTable
                    incidents={incidents}
                    clientId={params.id}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
