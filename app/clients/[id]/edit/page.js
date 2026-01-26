'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    street_address: '',
    secondary_address: '',
    city: '',
    state: '',
    email: '',
    producer_name: '',
    account_manager: '',
    ams_code: '',
    client_number: '',
    logo_url: ''
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch client details
  useEffect(() => {
    if (user && profile && params.id) {
      fetchClient()
    }
  }, [user, profile, params.id])

  async function fetchClient() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)
        .single()

      if (error) throw error

      setFormData({
        name: data.name || '',
        street_address: data.street_address || '',
        secondary_address: data.secondary_address || '',
        city: data.city || '',
        state: data.state || '',
        email: data.email || '',
        producer_name: data.producer_name || '',
        account_manager: data.account_manager || '',
        ams_code: data.ams_code || '',
        client_number: data.client_number || '',
        logo_url: data.logo_url || ''
      })
      setLogoPreview(data.logo_url || null)
    } catch (error) {
      console.error('Error fetching client:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.organization_id}/${params.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-logos')
        .getPublicUrl(fileName)

      // Update form data and preview
      setFormData(prev => ({
        ...prev,
        logo_url: publicUrl
      }))
      setLogoPreview(publicUrl)
    } catch (error) {
      console.error('Error uploading logo:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      logo_url: ''
    }))
    setLogoPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          street_address: formData.street_address,
          secondary_address: formData.secondary_address,
          city: formData.city,
          state: formData.state,
          email: formData.email,
          producer_name: formData.producer_name,
          account_manager: formData.account_manager,
          ams_code: formData.ams_code,
          client_number: formData.client_number,
          logo_url: formData.logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .eq('organization_id', profile.organization_id)

      if (error) throw error

      // Redirect back to client detail page
      router.push(`/clients/${params.id}`)
    } catch (error) {
      console.error('Error updating client:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#006B7D]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
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

        {/* Edit Form */}
        <div className="bg-white rounded-3xl shadow-md p-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8">Edit Client</h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="Enter client name"
              />
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                name="street_address"
                value={formData.street_address}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="Enter street address"
              />
            </div>

            {/* Secondary Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Secondary Address
              </label>
              <input
                type="text"
                name="secondary_address"
                value={formData.secondary_address}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="Suite, floor, etc."
              />
            </div>

            {/* City and State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  maxLength="2"
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all uppercase"
                  placeholder="NY"
                />
              </div>
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="email@example.com"
              />
            </div>

            {/* Contact / Producer Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact
              </label>
              <input
                type="text"
                name="producer_name"
                value={formData.producer_name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="Contact person name"
              />
            </div>

            {/* Account Manager */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Account Manager
              </label>
              <input
                type="text"
                name="account_manager"
                value={formData.account_manager}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                placeholder="Account manager name"
              />
            </div>

            {/* AMS Code and Client Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  AMS Code
                </label>
                <input
                  type="text"
                  name="ams_code"
                  value={formData.ams_code}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                  placeholder="AMS Code"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Number
                </label>
                <input
                  type="text"
                  name="client_number"
                  value={formData.client_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B7D]/20 focus:border-[#006B7D] transition-all"
                  placeholder="Client Number"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client Logo
              </label>

              {/* Logo Preview */}
              {logoPreview && (
                <div className="mb-4 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-red-600 hover:text-red-700 font-medium text-sm"
                  >
                    Remove Logo
                  </button>
                </div>
              )}

              {/* File Upload */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {uploading ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, GIF (max 5MB)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#006B7D] hover:bg-[#008BA3] text-white px-6 py-3.5 rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
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
