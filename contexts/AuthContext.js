'use client'

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

// Simple in-memory cache for profile
let profileCache = null
let profileCacheUserId = null

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(profileCache)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const loadingRef = useRef(false)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Use cached profile if available for this user
        if (profileCache && profileCacheUserId === session.user.id) {
          setProfile(profileCache)
          setLoading(false)
        } else {
          loadUserProfile(session.user.id)
        }
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
        // Use cached profile if available for this user
        if (profileCache && profileCacheUserId === session.user.id) {
          setProfile(profileCache)
          setLoading(false)
        } else {
          await loadUserProfile(session.user.id)
        }
      } else {
        setProfile(null)
        profileCache = null
        profileCacheUserId = null
        setLoading(false)
      }

      if (event === 'SIGNED_OUT') {
        profileCache = null
        profileCacheUserId = null
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  async function loadUserProfile(userId) {
    // Prevent duplicate requests
    if (loadingRef.current) return
    loadingRef.current = true

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, organization_id, organizations(id, name)')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Cache the profile
      profileCache = data
      profileCacheUserId = userId
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
      loadingRef.current = false
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
