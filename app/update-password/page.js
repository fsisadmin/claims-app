'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  // Handle password recovery flow
  useEffect(() => {
    // Listen for auth state changes, particularly PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)

      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the recovery link and Supabase processed the token
        console.log('Password recovery session established')
        setIsReady(true)
        setError(null)
      } else if (event === 'SIGNED_IN' && session) {
        // Also handle SIGNED_IN as recovery might trigger this
        setIsReady(true)
        setError(null)
      }
    })

    // Check for existing session or hash params
    const checkSession = async () => {
      try {
        // First check if there are hash params that need processing
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'recovery') {
          // There's a recovery token in the URL - Supabase will process it
          // via onAuthStateChange, just wait
          console.log('Recovery token found in URL, waiting for Supabase to process...')
          return
        }

        // Check existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Error loading session. Please try the reset link again.')
          return
        }

        if (session) {
          // Already have a valid session
          setIsReady(true)
        } else {
          // No session and no recovery token
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        console.error('Error checking session:', err)
        setError('Error loading page. Please try again.')
      }
    }

    // Small delay to allow Supabase to process hash params first
    const timer = setTimeout(checkSession, 100)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (error) throw error

      // Success - redirect to login
      alert('Password updated successfully! Please sign in with your new password.')
      router.push('/login')
    } catch (error) {
      console.error('Password update error:', error)
      setError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while waiting for recovery session
  if (!isReady && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B7D]"></div>
          <p className="mt-4 text-gray-600 font-medium">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-[#006B7D] text-white px-3 py-2 font-bold text-2xl">
              ST
            </div>
            <span className="text-[#006B7D] font-semibold text-2xl">
              FranklinStreet
            </span>
          </div>
          <h2 className="mt-6 text-3xl font-normal text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
            <p className="text-red-700 text-xs mt-2">
              <Link href="/reset-password" className="underline hover:text-red-900">
                Request a new password reset link
              </Link>
            </p>
          </div>
        )}

        {isReady && (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#006B7D] hover:bg-[#005566] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
