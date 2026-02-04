'use client'

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

// Simple in-memory cache for profile
let profileCache = null
let profileCacheUserId = null

// Timeout helper
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  ])
}

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
  const [connectionError, setConnectionError] = useState(false)
  const router = useRouter()
  const loadingRef = useRef(false)

  useEffect(() => {
    // Check active session with timeout
    const startTime = Date.now()
    console.log('[Auth] Starting getSession...')
    withTimeout(supabase.auth.getSession(), 15000)
      .then(({ data: { session } }) => {
        console.log(`[Auth] getSession completed in ${Date.now() - startTime}ms`)
        setUser(session?.user ?? null)
        setConnectionError(false)
        if (session?.user) {
          // Use cached profile if available for this user
          if (profileCache && profileCacheUserId === session.user.id) {
            console.log('[Auth] Using cached profile')
            setProfile(profileCache)
            setLoading(false)
          } else {
            loadUserProfile(session.user.id)
          }
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error(`[Auth] getSession failed after ${Date.now() - startTime}ms:`, error)
        setConnectionError(true)
        setLoading(false)
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

    const startTime = Date.now()
    console.log('[Auth] Starting profile load...')
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role, organization_id, organizations(id, name)')
          .eq('id', userId)
          .single(),
        15000
      )
      console.log(`[Auth] Profile loaded in ${Date.now() - startTime}ms`)

      if (error) throw error

      // Cache the profile
      profileCache = data
      profileCacheUserId = userId
      setProfile(data)
      setConnectionError(false)
    } catch (error) {
      console.error(`[Auth] Profile load failed after ${Date.now() - startTime}ms:`, error)
      setProfile(null)
      if (error.message === 'Request timeout') {
        setConnectionError(true)
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  // Retry connection
  function retryConnection() {
    setLoading(true)
    setConnectionError(false)
    withTimeout(supabase.auth.getSession(), 15000)
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          loadUserProfile(session.user.id)
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error('Retry failed:', error)
        setConnectionError(true)
        setLoading(false)
      })
  }

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    connectionError,
    retryConnection,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
  }), [user, profile, loading, connectionError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
