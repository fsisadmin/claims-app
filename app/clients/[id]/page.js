'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function ClientDetail({ params }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchClient()
    }
  }, [params.id, user])

  async function fetchClient() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      setClient(data)
    } catch (error) {
      console.error('Error fetching client:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-teal-600 hover:text-teal-700 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Clients
        </button>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="mt-4 text-gray-600">Loading client details...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading client: {error}</p>
          </div>
        )}

        {client && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-6">
              {client.name}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {client.ams_code && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    AMS Code
                  </dt>
                  <dd className="text-lg text-gray-900">{client.ams_code}</dd>
                </div>
              )}

              {client.client_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Client Number
                  </dt>
                  <dd className="text-lg text-gray-900">{client.client_number}</dd>
                </div>
              )}

              {client.producer_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Producer
                  </dt>
                  <dd className="text-lg text-gray-900">{client.producer_name}</dd>
                </div>
              )}

              {client.account_manager && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Account Manager
                  </dt>
                  <dd className="text-lg text-gray-900">{client.account_manager}</dd>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                This is a detail page for {client.name}. You can add more information and functionality here.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
