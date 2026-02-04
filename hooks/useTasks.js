'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// Fetcher for tasks
const tasksFetcher = async ([, organizationId, filters]) => {
  if (!organizationId) return []

  let query = supabase
    .from('tasks')
    .select(`
      *,
      owner:owner_id(id, full_name, email),
      assignee:assigned_to(id, full_name, email)
    `)
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.assignedTo) {
    if (filters.assignedTo === 'unassigned') {
      query = query.is('assigned_to', null)
    } else {
      query = query.eq('assigned_to', filters.assignedTo)
    }
  }
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  if (filters?.linkedEntityType && filters?.linkedEntityId) {
    query = query.eq('linked_entity_type', filters.linkedEntityType)
    query = query.eq('linked_entity_id', filters.linkedEntityId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Fetcher for single task
const taskFetcher = async ([, taskId, organizationId]) => {
  if (!taskId || !organizationId) return null

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      owner:owner_id(id, full_name, email),
      assignee:assigned_to(id, full_name, email)
    `)
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

// Fetcher for my tasks (assigned to current user)
const myTasksFetcher = async ([, userId, organizationId]) => {
  if (!userId || !organizationId) return []

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      owner:owner_id(id, full_name, email),
      assignee:assigned_to(id, full_name, email)
    `)
    .eq('organization_id', organizationId)
    .eq('assigned_to', userId)
    .in('status', ['assigned', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: false })

  if (error) throw error
  return data || []
}

// Hook to get all tasks with optional filters
export function useTasks(organizationId, filters = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    organizationId ? ['tasks', organizationId, filters] : null,
    tasksFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    tasks: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook to get a single task
export function useTask(taskId, organizationId) {
  const { data, error, isLoading, mutate } = useSWR(
    taskId && organizationId ? ['task', taskId, organizationId] : null,
    taskFetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    task: data,
    isLoading,
    error,
    mutate,
  }
}

// Hook to get tasks assigned to current user
export function useMyTasks(userId, organizationId) {
  const { data, error, isLoading, mutate } = useSWR(
    userId && organizationId ? ['myTasks', userId, organizationId] : null,
    myTasksFetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    tasks: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Create a new task
export async function createTask(taskData, organizationId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...taskData,
      organization_id: organizationId,
      owner_id: userId,
      created_by: userId,
      modified_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update a task
export async function updateTask(taskId, taskData, organizationId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...taskData,
      modified_by: userId,
    })
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a task
export async function deleteTask(taskId, organizationId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('organization_id', organizationId)

  if (error) throw error
}

// Close/complete a task
export async function closeTask(taskId, organizationId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'closed',
      completed_at: new Date().toISOString(),
      modified_by: userId,
    })
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) throw error
  return data
}
