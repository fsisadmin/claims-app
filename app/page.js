'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ClientCard from '@/components/ClientCard'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/hooks'

export default function Home() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // Use SWR-cached clients hook - instant load on subsequent visits
  const { clients, isLoading: clientsLoading, isError } = useClients(profile?.organization_id)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Optimized search with useMemo
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients
    }

    const query = searchQuery.toLowerCase()
    return clients.filter(
      client =>
        client.name?.toLowerCase().includes(query) ||
        client.ams_code?.toLowerCase().includes(query) ||
        client.client_number?.toLowerCase().includes(query) ||
        client.producer_name?.toLowerCase().includes(query) ||
        client.account_manager?.toLowerCase().includes(query)
    )
  }, [searchQuery, clients])

  // Don't render if not authenticated (will redirect)
  if (!authLoading && !user) {
    return null
  }

  // If profile failed to load but user exists, show error
  if (!authLoading && user && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-3xl shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Loading Error</h2>
          <p className="text-gray-600 mb-4">
            Unable to load your profile. This might be because:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>Your account hasn't been set up yet</li>
            <li>Database connection issues</li>
            <li>Permission issues with your account</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#006B7D] text-white px-4 py-2 rounded-lg hover:bg-[#008BA3] transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Check if user has organization assigned
  if (profile && !profile.organization_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-amber-900 mb-2">
              Organization Required
            </h2>
            <p className="text-amber-800">
              Your account has not been assigned to an organization yet. Please contact
              your administrator to be added to an organization before you can access
              clients.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Clients Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 text-center mb-8">
            Clients
          </h2>

          {/* Search and Add Client */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#006B7D] transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all shadow-sm hover:shadow-md text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Add Client Button */}
            <button
              onClick={() => router.push('/clients/add')}
              className="bg-[#006B7D] hover:bg-[#008BA3] text-white px-6 py-3.5 rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg hover:scale-[1.02] whitespace-nowrap active:scale-[0.98]"
            >
              Add Client
            </button>
          </div>
        </div>

        {/* Loading State */}
        {(authLoading || clientsLoading) && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading clients...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
            <p className="text-red-800 font-medium">
              Error loading clients: {isError.message}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Make sure you have set up your Supabase credentials in .env.local
            </p>
          </div>
        )}

        {/* Empty State */}
        {!authLoading && !clientsLoading && !isError && filteredClients.length === 0 && searchQuery && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No clients found matching "{searchQuery}"</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms</p>
          </div>
        )}

        {!authLoading && !clientsLoading && !isError && clients.length === 0 && !searchQuery && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#006B7D]/10 mb-4">
              <svg className="w-8 h-8 text-[#006B7D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No clients yet</p>
            <p className="text-gray-500 text-sm mt-2">Click "Add Client" to create your first one</p>
          </div>
        )}

        {/* Clients Grid */}
        {!authLoading && !clientsLoading && !isError && filteredClients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
