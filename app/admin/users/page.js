'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { getOrganizationUsers, updateUserRole, updateUserOrganization } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AdminUsers() {
  const router = useRouter()
  const { user, profile, isAdmin, loading: authLoading } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingUserId, setEditingUserId] = useState(null)
  const [updatingRole, setUpdatingRole] = useState(false)

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  // Fetch users
  useEffect(() => {
    if (profile?.organization_id && isAdmin) {
      fetchUsers()
    }
  }, [profile, isAdmin])

  async function fetchUsers() {
    try {
      setLoading(true)
      const data = await getOrganizationUsers(profile.organization_id)
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      setUpdatingRole(true)
      await updateUserRole(userId, newRole)

      // Update local state
      setUsers(users.map(u => (u.id === userId ? { ...u, role: newRole } : u)))
      setEditingUserId(null)
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role: ' + error.message)
    } finally {
      setUpdatingRole(false)
    }
  }

  async function handleRemoveFromOrganization(userId) {
    if (
      !confirm(
        'Are you sure you want to remove this user from the organization? They will lose access to all clients.'
      )
    ) {
      return
    }

    try {
      await updateUserOrganization(userId, null)
      setUsers(users.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Failed to remove user: ' + error.message)
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

  // Don't render if not authenticated or not admin (will redirect)
  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">
            Manage users and roles for{' '}
            {profile?.organizations?.name || 'your organization'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        )}

        {/* Users Table */}
        {!loading && users.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(usr => (
                    <tr key={usr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                            {usr.full_name
                              ? usr.full_name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .substring(0, 2)
                              : '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usr.full_name || 'Unnamed User'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{usr.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUserId === usr.id ? (
                          <select
                            value={usr.role}
                            onChange={e =>
                              handleRoleChange(usr.id, e.target.value)
                            }
                            disabled={updatingRole}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="user">User</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              usr.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : usr.role === 'manager'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {usr.role || 'user'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(usr.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {usr.id !== user.id && (
                          <div className="flex items-center justify-end gap-2">
                            {editingUserId === usr.id ? (
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingUserId(usr.id)}
                                className="text-teal-600 hover:text-teal-900"
                              >
                                Change Role
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveFromOrganization(usr.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {usr.id === user.id && (
                          <span className="text-gray-400 text-xs">(You)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && users.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No users found in your organization.</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            How to add new users
          </h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Have the new user sign up at /signup</li>
            <li>
              Once they sign up, run this SQL in Supabase SQL Editor (replace
              USER_ID with their actual ID):
            </li>
          </ol>
          <pre className="mt-3 bg-blue-100 text-blue-900 p-3 rounded text-xs overflow-x-auto">
            {`UPDATE user_profiles
SET role = 'user',
    organization_id = '${profile?.organization_id || 'YOUR_ORG_ID'}'
WHERE id = 'USER_ID_HERE';`}
          </pre>
          <p className="text-xs text-blue-700 mt-2">
            You can find the user's ID in the Supabase Auth dashboard after they
            sign up.
          </p>
        </div>
      </main>
    </div>
  )
}
