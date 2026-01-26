'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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

  async function loadUserProfile(userId) {
    try {
      console.log('🔍 Loading profile for user:', userId)

      // Add timeout protection (10 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile loading timeout after 10s')), 10000)
      )

      const profilePromise = getUserProfile(userId)
      const profileData = await Promise.race([profilePromise, timeoutPromise])

      console.log('✅ Profile loaded:', profileData)
      setProfile(profileData)
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      console.error('Error details:', error.message)
      // Set profile to null on error but user can still see they're logged in
      setProfile(null)
    } finally {
      console.log('🏁 Setting loading to false')
      setLoading(false)
    }
  }

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
