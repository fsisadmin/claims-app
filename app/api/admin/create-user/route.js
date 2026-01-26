import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Create a Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { email, fullName, role, organizationId } = await request.json()

    // Validate inputs
    if (!email || !fullName || !role || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth (they'll receive password setup email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Update user profile with organization and role
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: fullName,
        organization_id: organizationId,
        role,
        email,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile error:', profileError)
      // Try to clean up the auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    // Generate password setup link (recovery type allows setting password)
    // Note: The redirect URL should match your production domain or localhost
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`
      : 'http://localhost:3000/update-password'

    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl,
      }
    })

    if (resetError) {
      console.error('Password setup link error:', resetError)
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      setupLink: resetData?.properties?.action_link || null,
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
