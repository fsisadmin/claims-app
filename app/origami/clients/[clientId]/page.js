'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import OrigamiClaimsTable from '@/components/OrigamiClaimsTable'
import OrigamiIncidentsTable from '@/components/OrigamiIncidentsTable'
import OrigamiPoliciesTable from '@/components/OrigamiPoliciesTable'

function getInitials(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

function getColorFromName(name) {
  const colors = ['bg-slate-400', 'bg-gray-400', 'bg-zinc-400', 'bg-neutral-400', 'bg-stone-400', 'bg-slate-500', 'bg-gray-500', 'bg-zinc-500']
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function OrigamiClientPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [client, setClient] = useState(null)
  const [claims, setClaims] = useState([])
  const [incidents, setIncidents] = useState([])
  const [policies, setPolicies] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('origami-claims')

  const fetchData = useCallback(async () => {
    if (!params.clientId || !profile?.organization_id) return
    setLoading(true)
    try {
      // Fetch the origami client directly
      const res = await fetch('/api/origami/client-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origamiClientId: Number(params.clientId),
          organizationId: profile.organization_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClient(data.client)
      setClaims(data.claims || [])
      setIncidents(data.incidents || [])
      setPolicies(data.policies || [])
      setLocations(data.origamiLocations || [])
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.clientId, profile?.organization_id])

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && profile) fetchData()
  }, [user, profile, fetchData])

  if (authLoading || !profile || loading) {
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

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-600">{error || 'Client not found'}</p>
            <button onClick={() => router.back()} className="mt-4 text-[#006B7D] hover:underline">Go Back</button>
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Client Header */}
        <div className="bg-white rounded-3xl shadow-md p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-2xl ${bgColor} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                {client.city && <span>{client.city}{client.state ? `, ${client.state}` : ''}</span>}
                {client.reference_number && <span>Ref: {client.reference_number}</span>}
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                  Not linked to AMS app
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'origami-claims', label: 'Claims', count: claims.length },
                { id: 'incidents', label: 'Incidents', count: incidents.length },
                { id: 'origami-policies', label: 'Policies', count: policies.length },
                { id: 'locations', label: 'Locations', count: locations.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-8 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#006B7D] text-[#006B7D]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.label}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{tab.count}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'origami-claims' && <OrigamiClaimsTable claims={claims} />}
            {activeTab === 'incidents' && <OrigamiIncidentsTable incidents={incidents} />}
            {activeTab === 'origami-policies' && <OrigamiPoliciesTable policies={policies} />}
            {activeTab === 'locations' && (
              <div>
                {locations.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No locations found</div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {locations.map(loc => (
                      <a key={loc.location_id} href={`/origami/locations/${loc.location_id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{loc.description || loc.street1 || `Location ${loc.location_id}`}</p>
                          <p className="text-xs text-gray-500">
                            {[loc.street1, loc.city, loc.state_id, loc.postal_code].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">#{loc.display_code || loc.location_id}</span>
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
