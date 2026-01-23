'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { US_STATES } from '@/lib/constants'

export default function AddClient() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    ams_code: '',
    client_number: '',
    producer_name: '',
    account_manager: '',
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogoChange = e => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB')
        return
      }

      setLogoFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) return null

    try {
      setUploading(true)

      // Generate unique filename
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `client-logos/${profile.organization_id}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('clients')
        .upload(filePath, logoFile)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('clients')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      throw new Error(`Failed to upload logo: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Client name is required')
      return
    }

    // Check if user has organization
    if (!profile?.organization_id) {
      setError('You must be assigned to an organization to add clients')
      return
    }

    try {
      setLoading(true)

      // Upload logo if provided
      let logoUrl = null
      if (logoFile) {
        logoUrl = await uploadLogo()
      }

      const { data, error } = await supabase.from('clients').insert([
        {
          name: formData.name.trim(),
          state: formData.state || null,
          logo_url: logoUrl,
          ams_code: formData.ams_code.trim() || null,
          client_number: formData.client_number.trim() || null,
          producer_name: formData.producer_name.trim() || null,
          account_manager: formData.account_manager.trim() || null,
          organization_id: profile.organization_id,
        },
      ])

      if (error) throw error

      // Redirect to home page on success
      router.push('/')
    } catch (error) {
      console.error('Error adding client:', error)
      setError(error.message)
    } finally {
      setLoading(false)
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

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Add New Client</h1>
            <p className="text-gray-600 mt-1">
              Fill in the details below to add a new client to your system.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter client name"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Logo
              </label>
              <div className="flex items-start gap-4">
                {logoPreview && (
                  <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-teal-50 file:text-teal-700
                      hover:file:bg-teal-100
                      cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* State */}
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                State
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select a state...</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </div>

            {/* AMS Code */}
            <div>
              <label
                htmlFor="ams_code"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                AMS Code
              </label>
              <input
                type="text"
                id="ams_code"
                name="ams_code"
                value={formData.ams_code}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter AMS code"
              />
            </div>

            {/* Client Number */}
            <div>
              <label
                htmlFor="client_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Client Number
              </label>
              <input
                type="text"
                id="client_number"
                name="client_number"
                value={formData.client_number}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter client number"
              />
            </div>

            {/* Producer Name */}
            <div>
              <label
                htmlFor="producer_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Producer Name
              </label>
              <input
                type="text"
                id="producer_name"
                name="producer_name"
                value={formData.producer_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter producer name"
              />
            </div>

            {/* Account Manager */}
            <div>
              <label
                htmlFor="account_manager"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Account Manager
              </label>
              <input
                type="text"
                id="account_manager"
                name="account_manager"
                value={formData.account_manager}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
                placeholder="Enter account manager name"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading logo...' : loading ? 'Adding Client...' : 'Add Client'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                disabled={loading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
