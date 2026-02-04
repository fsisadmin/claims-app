'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ClientCard from '@/components/ClientCard'
import { useAuth } from '@/contexts/AuthContext'
import { useClients, useRecentClients, useMyTasks } from '@/hooks'

export default function Home() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // Use SWR-cached clients hook - instant load on subsequent visits
  const { clients, isLoading: clientsLoading, isError } = useClients(profile?.organization_id)

  // Get recently viewed clients
  const { recentClients } = useRecentClients(profile?.organization_id)

  // Get user's tasks for the sidebar panel
  const { tasks: myTasks } = useMyTasks(profile?.id, profile?.organization_id)
  const [showTasksPanel, setShowTasksPanel] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Search results - only when searching
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return []
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

  const isOverdue = (dueDate, status) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && !['completed', 'cancelled'].includes(status)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      {/* Tasks Panel - Fixed right sidebar */}
      {showTasksPanel && myTasks.length > 0 && (
        <div className="fixed right-0 top-[180px] w-80 h-[calc(100vh-180px)] bg-white border-l border-gray-200 shadow-lg z-40 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#006B7D] to-[#008BA3]">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              My Tasks ({myTasks.length})
            </h3>
            <button
              onClick={() => setShowTasksPanel(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {myTasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks?task=${task.id}`)}
                className="p-4 bg-white hover:bg-gray-50 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-gray-900 line-clamp-2">{task.title}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="text-sm text-[#006B7D] font-medium mb-1">{task.client_name}</div>
                {task.linked_entity_type && task.linked_entity_name && (
                  <div className="text-xs text-gray-600 flex items-center gap-1.5 mb-2 bg-gray-100 px-2 py-1 rounded-md w-fit">
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{task.linked_entity_name}</span>
                  </div>
                )}
                <div className={`text-xs flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {task.due_date ? (
                    <>
                      {new Date(task.due_date).toLocaleDateString()}
                      {isOverdue(task.due_date, task.status) && ' (Overdue)'}
                    </>
                  ) : (
                    'No due date'
                  )}
                </div>
              </div>
            ))}
            {myTasks.length > 10 && (
              <button
                onClick={() => router.push('/tasks')}
                className="w-full text-center text-sm text-[#006B7D] hover:text-[#008BA3] font-medium py-2"
              >
                View all {myTasks.length} tasks →
              </button>
            )}
          </div>
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => router.push('/tasks')}
              className="w-full px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Tasks
            </button>
          </div>
        </div>
      )}

      {/* Toggle button when panel is closed */}
      {!showTasksPanel && myTasks.length > 0 && (
        <button
          onClick={() => setShowTasksPanel(true)}
          className="fixed right-4 top-[190px] z-40 bg-[#006B7D] hover:bg-[#008BA3] text-white p-3 rounded-full shadow-lg transition-all hover:scale-105"
          title="Show tasks"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {myTasks.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold rounded-full bg-red-500 text-white">
              {myTasks.length}
            </span>
          )}
        </button>
      )}

      <main className={`max-w-7xl mx-auto px-6 py-8 ${showTasksPanel && myTasks.length > 0 ? 'mr-80' : ''}`}>
        {/* Loading State */}
        {(authLoading || !profile || clientsLoading) && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
            <p className="text-red-800 font-medium">
              Error loading clients: {isError.message}
            </p>
          </div>
        )}

        {/* Main Content - Only show when loaded */}
        {!authLoading && profile && !clientsLoading && !isError && (
          <>
            {/* Recently Viewed Section */}
            {!searchQuery && recentClients.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recently Viewed
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentClients.map(client => (
                    <ClientCard key={client.id} client={client} />
                  ))}
                </div>
              </div>
            )}

            {/* Search and Add Client */}
            <div className="flex items-center gap-3 mb-6">
              {/* Search Bar */}
              <div className="flex-1">
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

            {/* Search Results - Only show when searching */}
            {searchQuery && filteredClients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Search Results ({filteredClients.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClients.map(client => (
                    <ClientCard key={client.id} client={client} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State - Search */}
            {searchQuery && filteredClients.length === 0 && (
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

            {/* Empty State - No Recent Clients */}
            {!searchQuery && recentClients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Search for a client or view your recently accessed clients here</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
