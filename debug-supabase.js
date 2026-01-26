// Debug script to check Supabase connection and user profile
// Run with: node debug-supabase.js YOUR_USER_EMAIL

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mlumqpqebzeutvhdxpqt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdW1xcHFlYnpldXR2aGR4cHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTI5NDEsImV4cCI6MjA4NDY2ODk0MX0.8zu-G71E0EK1avhGCTTp7UcdNah0LkWSdmAEKbefz18'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('🔍 Checking Supabase connection...\n')

  // Test connection
  try {
    const { data, error } = await supabase.from('user_profiles').select('count')
    if (error) {
      console.error('❌ Connection error:', error.message)
      return
    }
    console.log('✅ Connected to Supabase\n')
  } catch (err) {
    console.error('❌ Failed to connect:', err.message)
    return
  }

  // Get current user (if logged in)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('⚠️  No user is currently logged in')
    console.log('   Try logging in at http://localhost:3000/login\n')
    return
  }

  console.log('👤 Current user:', user.email)
  console.log('   User ID:', user.id)
  console.log()

  // Get user profile
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        organizations (
          id,
          name
        )
      `)
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('❌ Profile error:', error.message)
      console.log('\n💡 This user might not have a profile in user_profiles table')
      return
    }

    if (!profile) {
      console.log('⚠️  No profile found for this user')
      console.log('   The user needs to be added to the user_profiles table\n')
      return
    }

    console.log('✅ Profile loaded:')
    console.log('   Name:', profile.full_name)
    console.log('   Email:', profile.email)
    console.log('   Role:', profile.role)
    console.log('   Organization ID:', profile.organization_id)
    console.log('   Organization Name:', profile.organizations?.name || 'N/A')
    console.log()

    if (!profile.organization_id) {
      console.log('⚠️  WARNING: User has no organization assigned!')
      console.log('   The app will show "Organization Required" message')
      console.log('   An admin needs to assign this user to an organization\n')
      return
    }

    // Check clients for this organization
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('count')
      .eq('organization_id', profile.organization_id)

    if (clientError) {
      console.error('❌ Client query error:', clientError.message)
    } else {
      console.log('📊 Clients in organization:', clients?.length || 0)
    }

    console.log('\n✅ Everything looks good! The app should work.')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

debug().catch(console.error)
