'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, isAdmin } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const userName = profile?.full_name?.split(' ')[0] || 'User'
  const userInitials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '?'

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-8">
          {/* Franklin Street Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img
              src="/favicon.ico"
              alt="Franklin Street"
              className="h-10 w-auto"
            />
          </Link>

          {/* Admin Navigation */}
          {isAdmin && (
            <nav className="flex items-center gap-2">
              <Link
                href="/admin/users"
                className="px-4 py-2 text-[#006B7D] hover:bg-gray-100 rounded-full text-sm font-medium transition-all"
              >
                Users
              </Link>
              <Link
                href="/admin/add-user"
                className="px-4 py-2 text-[#006B7D] hover:bg-gray-100 rounded-full text-sm font-medium transition-all"
              >
                Add User
              </Link>
            </nav>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <span className="text-sm font-medium">FAQs</span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#006B7D] to-[#008BA3] flex items-center justify-center text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              {userInitials}
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-200/50">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{profile?.email}</p>
                    {profile?.role && (
                      <span className="inline-block mt-2 px-3 py-1 text-xs bg-[#006B7D]/10 text-[#006B7D] rounded-full font-medium">
                        {profile.role}
                      </span>
                    )}
                  </div>
                  {profile?.organizations && (
                    <div className="px-4 py-3 border-b border-gray-200/50">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organization</p>
                      <p className="text-sm text-gray-900 mt-1 font-medium">
                        {profile.organizations.name}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium rounded-lg mx-1 mt-1"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Banner - Only show on home page */}
      {pathname === '/' && (
        <div className="bg-gradient-to-br from-[#006B7D] to-[#008BA3] text-white px-6 py-6">
          <h1 className="text-2xl font-semibold text-center">Welcome, {userName}</h1>
        </div>
      )}
    </header>
  )
}
