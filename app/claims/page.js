'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import ClaimsTable from '@/components/ClaimsTable'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

// Inner component that uses useSearchParams
function ClaimsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useAuth()

  // Selected client
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)

  // Data states
  const [clients, setClients] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Check URL for client param
  useEffect(() => {
    const clientId = searchParams.get('client')
    if (clientId) {
      setSelectedClientId(clientId)
    }
  }, [searchParams])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch clients
  const fetchClients = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, ams_code, account_manager')
        .eq('organization_id', profile.organization_id)
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id])

  // Fetch claims for selected client
  const fetchClaims = useCallback(async () => {
    if (!profile?.organization_id || !selectedClientId) return

    setClaimsLoading(true)
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('client_id', selectedClientId)
        .order('report_date', { ascending: false })

      if (error) throw error
      setClaims(data || [])

      // Also fetch the client details
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', selectedClientId)
        .single()

      setSelectedClient(clientData)
    } catch (error) {
      console.error('Error fetching claims:', error)
    } finally {
      setClaimsLoading(false)
    }
  }, [profile?.organization_id, selectedClientId])

  useEffect(() => {
    if (user && profile) {
      fetchClients()
    }
  }, [user, profile, fetchClients])

  useEffect(() => {
    if (selectedClientId && user && profile) {
      fetchClaims()
    }
  }, [selectedClientId, user, profile, fetchClaims])

  // Handle client selection
  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId)
    router.push(`/claims?client=${clientId}`)
  }

  // Handle back to client selection
  const handleBackToClients = () => {
    setSelectedClientId(null)
    setSelectedClient(null)
    setClaims([])
    router.push('/claims')
  }

  // Filter clients by search
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.ams_code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D]"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Show client selector if no client selected */}
        {!selectedClientId ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-gray-900 text-center mb-2">Claims</h1>
              <p className="text-center text-gray-600">Select a client to view their claims</p>
            </div>

            {/* Search */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900 shadow-sm"
                />
              </div>
            </div>

            {/* Clients Grid */}
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
                <p className="mt-4 text-gray-600">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                {searchQuery ? 'No clients found matching your search' : 'No clients found'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => {
                  const initials = getInitials(client.name)
                  const bgColor = getColorFromName(client.name)

                  return (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 border border-gray-100 hover:border-[#006B7D]/30"
                    >
                      <div className={`${bgColor} w-12 h-12 flex items-center justify-center text-white text-lg font-bold rounded-xl flex-shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                        {client.ams_code && (
                          <p className="text-sm text-gray-500">AMS: {client.ams_code}</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Claims view for selected client */}
            <div className="mb-6">
              <button
                onClick={handleBackToClients}
                className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2 mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Client Selection
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Claims - {selectedClient?.name || 'Loading...'}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Manage claims for this client
                  </p>
                </div>
                <Link
                  href={`/clients/${selectedClientId}`}
                  className="text-[#006B7D] hover:underline text-sm"
                >
                  View Client Details →
                </Link>
              </div>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              {claimsLoading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
                  <p className="mt-4 text-gray-600">Loading claims...</p>
                </div>
              ) : (
                <ClaimsTable
                  claims={claims}
                  clientId={selectedClientId}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function ClaimsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D]"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <ClaimsPageContent />
    </Suspense>
  )
}
