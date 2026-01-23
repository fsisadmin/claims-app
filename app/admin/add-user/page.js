'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'

export default function AddUserPage() {
  const router = useRouter()
  const { profile, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [setupLink, setSetupLink] = useState(null)

  // Redirect if not admin
  if (profile && !isAdmin) {
    router.push('/')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSetupLink(null)

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          fullName,
          role,
          organizationId: profile.organization_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setSetupLink(data.setupLink)
      setEmail('')
      setFullName('')
      setRole('user')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#006B7D] hover:text-[#008BA3] font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Add New User</h1>
          <p className="text-gray-600 mb-8">
            Create a new user account. They'll receive an email to set their password.
          </p>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {setupLink && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-green-800 font-medium mb-2">User created successfully!</p>
              <p className="text-sm text-green-700 mb-3">
                Copy this link and send it to the user to set up their password:
              </p>
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <code className="text-xs text-gray-800 break-all">{setupLink}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(setupLink)
                  alert('Link copied to clipboard!')
                }}
                className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium"
              >
                📋 Copy Link
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#006B7D] hover:bg-[#008BA3] text-white px-6 py-3.5 rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
