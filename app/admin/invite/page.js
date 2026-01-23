'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import {
  createInvitation,
  getOrganizationInvitations,
  deleteInvitation,
} from '@/lib/auth'

export default function AdminInvitePage() {
  const router = useRouter()
  const { user, profile, isAdmin, loading: authLoading } = useAuth()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'user',
  })

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  // Fetch invitations
  useEffect(() => {
    if (profile?.organization_id && isAdmin) {
      fetchInvitations()
    }
  }, [profile, isAdmin])

  async function fetchInvitations() {
    try {
      setLoading(true)
      const data = await getOrganizationInvitations(profile.organization_id)
      setInvitations(data || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSendingInvite(true)

    try {
      const invitation = await createInvitation(
        formData.email,
        profile.organization_id,
        formData.role
      )

      // Generate invitation URL
      const inviteUrl = `${window.location.origin}/signup?token=${invitation.token}`

      setSuccess({
        message: 'Invitation created successfully!',
        url: inviteUrl,
      })

      // Reset form
      setFormData({ email: '', role: 'user' })

      // Refresh invitations list
      await fetchInvitations()
    } catch (error) {
      console.error('Error creating invitation:', error)
      setError(error.message || 'Failed to create invitation')
    } finally {
      setSendingInvite(false)
    }
  }

  async function handleDeleteInvitation(invitationId) {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return
    }

    try {
      await deleteInvitation(invitationId)
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
    } catch (error) {
      console.error('Error deleting invitation:', error)
      alert('Failed to delete invitation: ' + error.message)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    alert('Invitation link copied to clipboard!')
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

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Invite New Users
          </h1>
          <p className="text-gray-600">
            Send invitation links to add new users to{' '}
            {profile?.organizations?.name || 'your organization'}
          </p>
        </div>

        {/* Invitation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create Invitation
          </h2>

          {/* Success Message with URL */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-2">{success.message}</p>
              <div className="bg-white border border-green-300 rounded p-3 mt-2">
                <p className="text-xs text-gray-600 mb-1">Invitation Link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={success.url}
                    readOnly
                    className="flex-1 text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-300"
                  />
                  <button
                    onClick={() => copyToClipboard(success.url)}
                    className="px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Send this link to the user. It expires in 7 days.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Users can view and add clients. Managers can also delete clients. Admins have full access.
              </p>
            </div>

            <button
              type="submit"
              disabled={sendingInvite}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingInvite ? 'Creating invitation...' : 'Create invitation'}
            </button>
          </form>
        </div>

        {/* Pending Invitations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Invitations
          </h2>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-2 text-gray-600">Loading invitations...</p>
            </div>
          )}

          {!loading && invitations.filter(inv => !inv.used_at).length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No pending invitations. Create one above to invite a new user.
            </p>
          )}

          {!loading && invitations.filter(inv => !inv.used_at).length > 0 && (
            <div className="space-y-4">
              {invitations
                .filter(inv => !inv.used_at)
                .map(inv => {
                  const isExpired = new Date(inv.expires_at) < new Date()
                  const expiresIn = Math.ceil(
                    (new Date(inv.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{inv.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {inv.role}
                          </span>
                          {isExpired ? (
                            <span className="text-xs text-red-600">Expired</span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Expires in {expiresIn} {expiresIn === 1 ? 'day' : 'days'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/signup?token=${inv.token}`
                            )
                          }
                          className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleDeleteInvitation(inv.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
