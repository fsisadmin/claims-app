'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { getAllUsers, updateUserRole, updateUserOrganization } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AdminUsers() {
  const router = useRouter()
  const { user, profile, isAdmin, loading: authLoading } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingUserId, setEditingUserId] = useState(null)
  const [updatingRole, setUpdatingRole] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(null)

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    setInviting(true)
    try {
      const res = await fetch('/api/admin/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: profile.organization_id,
          invitedBy: profile.id,
          inviterName: profile.full_name,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send invitation')
      setInviteSuccess({ message: `Invitation emailed to ${inviteEmail}.`, url: json.inviteUrl })
      setInviteEmail('')
      setInviteRole('user')
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  // Fetch users
  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  async function fetchUsers() {
    try {
      setLoading(true)
      const data = await getAllUsers()
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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage users and roles for{' '}
              {profile?.organizations?.name || 'your organization'}
            </p>
          </div>
          <button
            onClick={() => { setShowInvite(true); setInviteError(null); setInviteSuccess(null) }}
            className="bg-[#006B7D] hover:bg-[#008BA3] text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite User
          </button>
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Invite User</h2>
                <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                They&apos;ll receive an email with a link to create their account.
              </p>

              {inviteError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{inviteError}</div>
              )}

              {inviteSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p className="text-green-800 font-medium">{inviteSuccess.message}</p>
                  {inviteSuccess.url && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteSuccess.url); alert('Backup link copied.') }}
                      className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
                    >
                      Copy backup link
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                    placeholder="user@franklinst.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] text-gray-900 bg-white"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    disabled={inviting}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="px-4 py-2 bg-[#006B7D] hover:bg-[#008BA3] text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                  >
                    {inviting ? 'Sending…' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                      Organization
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
                        <div className="text-sm text-gray-900">{usr.organizations?.name || '-'}</div>
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

      </main>
    </div>
  )
}
