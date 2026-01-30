'use client'

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
  client_id, organization_id
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
    .order('location_name', { ascending: true })
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
      dedupingInterval: 5000,
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

  const { data, error } = await supabase
    .from('clients')
    .select(CLIENTS_LIST_COLUMNS)
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
    .limit(500) // Safety limit

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
      dedupingInterval: 5000,
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
