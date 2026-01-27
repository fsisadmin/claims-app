'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// Fetcher function for locations
async function fetchLocations({ clientId, organizationId }) {
  if (!clientId || !organizationId) {
    return []
  }

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('client_id', clientId)
    .eq('organization_id', organizationId)
    .order('location_name', { ascending: true })

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
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
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
      dedupingInterval: 5000,
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
      dedupingInterval: 5000,
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
