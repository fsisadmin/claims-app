'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserProfile } from '@/lib/auth'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }

      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  async function loadUserProfile(userId, retryCount = 0) {
    const maxRetries = 2
    const timeout = 15000 // 15 seconds

    try {
      console.log('🔍 Loading profile for user:', userId, retryCount > 0 ? `(retry ${retryCount})` : '')

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Profile loading timeout after ${timeout/1000}s`)), timeout)
      )

      const profilePromise = getUserProfile(userId)
      const profileData = await Promise.race([profilePromise, timeoutPromise])

      console.log('✅ Profile loaded:', profileData)
      setProfile(profileData)
      setLoading(false)
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      console.error('Error details:', error.message)

      // Retry on timeout or network errors
      if (retryCount < maxRetries && (error.message.includes('timeout') || error.message.includes('fetch'))) {
        console.log(`🔄 Retrying profile load... (attempt ${retryCount + 2}/${maxRetries + 1})`)
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
        return loadUserProfile(userId, retryCount + 1)
      }

      // Set profile to null on error but user can still see they're logged in
      console.log('🏁 Setting loading to false after error')
      setProfile(null)
      setLoading(false)
    }
  }

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
  }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
