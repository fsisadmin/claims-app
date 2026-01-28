'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import LocationsTable from '@/components/LocationsTable'
import ClaimsTable from '@/components/ClaimsTable'
import CommentSidebar from '@/components/CommentSidebar'
import { useClient, useLocations } from '@/hooks'

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
  const { user, profile, loading: authLoading } = useAuth()
  const [claims, setClaims] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('locations')

  // Use SWR hooks for cached data fetching
  const { client, isLoading: clientLoading } = useClient(params.id, profile?.organization_id)
  const { locations, isLoading: locationsLoading, refresh: refreshLocations } = useLocations(params.id, profile?.organization_id)

  // Fetch claims for this client
  const fetchClaims = useCallback(async () => {
    if (!profile?.organization_id || !params.id) return

    setClaimsLoading(true)
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('client_id', params.id)
        .order('report_date', { ascending: false })

      if (error) throw error
      setClaims(data || [])
    } catch (error) {
      console.error('Error fetching claims:', error)
    } finally {
      setClaimsLoading(false)
    }
  }, [profile?.organization_id, params.id])

  // Fetch claims when tab changes to claims
  useEffect(() => {
    if (activeTab === 'claims' && user && profile) {
      fetchClaims()
    }
  }, [activeTab, user, profile, fetchClaims])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || clientLoading) {
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

  if (!user || !client) {
    return null
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
                    {claims.length}
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
          </div>
        </div>
      </main>
    </div>
  )
}
