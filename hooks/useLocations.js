'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// Columns needed for locations list view (reduces payload from 100+ to ~20 columns)
const LOCATIONS_LIST_COLUMNS = `
  id, location_name, company, entity_name,
  street_address, city, state, zip, county,
  num_buildings, num_units, square_footage,
  construction_description, orig_year_built,
  real_property_value, personal_property_value, total_tiv,
  tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone,
  client_id, organization_id, created_at
`

// Fetcher function for locations
async function fetchLocations({ clientId, organizationId }) {
  if (!clientId || !organizationId) {
    return []
  }

  const { data, error } = await supabase
    .from('locations')
    .select(LOCATIONS_LIST_COLUMNS)
    .eq('client_id', clientId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true }) // Oldest first, new rows at bottom
    .limit(500) // Prevent unbounded queries

  if (error) throw error
  return data || []
}

// Custom hook for fetching locations with SWR caching
export function useLocations(clientId, organizationId) {
  const { data, error, isLoading, mutate } = useSWR(
    clientId && organizationId ? ['locations', clientId, organizationId] : null,
    () => fetchLocations({ clientId, organizationId }),
    {
      revalidateOnFocus: false, // Don't refetch when window gains focus
      revalidateOnReconnect: true, // Refetch when reconnecting
      dedupingInterval: 30000, // Dedupe requests within 5 seconds
    }
  )

  return {
    locations: data || [],
    isLoading,
    isError: error,
    refresh: mutate, // Call this to manually refresh the data
    mutate, // For optimistic updates
  }
}

// Fetcher function for a single location
async function fetchLocation({ locationId, organizationId }) {
  if (!locationId || !organizationId) {
    return null
  }

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

// Custom hook for fetching a single location
export function useLocation(locationId, organizationId) {
  const { data, error, isLoading, mutate } = useSWR(
    locationId && organizationId ? ['location', locationId, organizationId] : null,
    () => fetchLocation({ locationId, organizationId }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    location: data,
    isLoading,
    isError: error,
    refresh: mutate,
    mutate,
  }
}

// Fetcher function for client details
async function fetchClient({ clientId, organizationId }) {
  if (!clientId || !organizationId) {
    return null
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

// Custom hook for fetching a client
export function useClient(clientId, organizationId) {
  const { data, error, isLoading, mutate } = useSWR(
    clientId && organizationId ? ['client', clientId, organizationId] : null,
    () => fetchClient({ clientId, organizationId }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    client: data,
    isLoading,
    isError: error,
    refresh: mutate,
    mutate,
  }
}

// Columns needed for clients list
const CLIENTS_LIST_COLUMNS = 'id, name, state, ams_code, client_number, producer_name, account_manager, logo_url'

// Fetcher function for paginated clients
async function fetchClientsPaginated({ organizationId, page = 0, pageSize = 50 }) {
  if (!organizationId) {
    return { data: [], count: 0 }
  }

  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('clients')
    .select(CLIENTS_LIST_COLUMNS, { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
    .range(from, to)

  if (error) throw error
  return { data: data || [], count: count || 0 }
}

// Custom hook for fetching paginated clients with SWR caching
export function useClientsPaginated(organizationId, page = 0, pageSize = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    organizationId ? ['clients', organizationId, page, pageSize] : null,
    () => fetchClientsPaginated({ organizationId, page, pageSize }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  )

  return {
    clients: data?.data || [],
    totalCount: data?.count || 0,
    totalPages: Math.ceil((data?.count || 0) / pageSize),
    isLoading,
    isError: error,
    refresh: mutate,
    mutate,
  }
}

// Fetcher function for all clients (with limit for safety)
async function fetchClients({ organizationId }) {
  if (!organizationId) {
    return []
  }

  const startTime = Date.now()
  console.log('[Clients] Starting fetch...')
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENTS_LIST_COLUMNS)
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
    .limit(500) // Safety limit
  console.log(`[Clients] Fetch completed in ${Date.now() - startTime}ms, got ${data?.length || 0} clients`)

  if (error) throw error
  return data || []
}

// Custom hook for fetching all clients with SWR caching (use for search)
export function useClients(organizationId) {
  const { data, error, isLoading, mutate } = useSWR(
    organizationId ? ['clients', organizationId] : null,
    () => fetchClients({ organizationId }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  )

  return {
    clients: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
    mutate,
  }
}

// ============================================================
// Recently Viewed Clients (localStorage)
// ============================================================

const RECENT_CLIENTS_KEY = 'recentlyViewedClients'
const MAX_RECENT_CLIENTS = 5

// Get recently viewed client IDs from localStorage
export function getRecentClientIds() {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_CLIENTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Track a client view (call when user clicks into a client)
export function trackClientView(clientId) {
  if (typeof window === 'undefined' || !clientId) return
  try {
    const recent = getRecentClientIds()
    // Remove if already exists, then add to front
    const filtered = recent.filter(id => id !== clientId)
    const updated = [clientId, ...filtered].slice(0, MAX_RECENT_CLIENTS)
    localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify(updated))
  } catch {
    // Ignore localStorage errors
  }
}

// Fetch recently viewed clients by IDs
async function fetchRecentClients({ clientIds, organizationId }) {
  if (!organizationId || !clientIds.length) return []

  const { data, error } = await supabase
    .from('clients')
    .select(CLIENTS_LIST_COLUMNS)
    .eq('organization_id', organizationId)
    .in('id', clientIds)

  if (error) throw error

  // Sort by the order in clientIds (most recent first)
  const sorted = clientIds
    .map(id => data?.find(c => c.id === id))
    .filter(Boolean)

  return sorted
}

// Hook to get recently viewed clients
export function useRecentClients(organizationId) {
  const [clientIds, setClientIds] = useState([])

  // Load IDs from localStorage on mount
  useEffect(() => {
    setClientIds(getRecentClientIds())
  }, [])

  const { data, error, isLoading } = useSWR(
    organizationId && clientIds.length ? ['recentClients', organizationId, clientIds.join(',')] : null,
    () => fetchRecentClients({ clientIds, organizationId }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    recentClients: data || [],
    isLoading,
    isError: error,
  }
}

