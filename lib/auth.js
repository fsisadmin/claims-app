import { supabase } from './supabase'

// Sign up new user
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

// Sign in existing user
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return user
}

// Get user profile with organization info
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      `
      *,
      organizations (
        id,
        name
      )
    `
    )
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// Check if user is admin
export async function isAdmin(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) return false
  return data?.role === 'admin'
}

// Get all users in organization (admin only)
export async function getOrganizationUsers(organizationId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Create new user (admin only)
export async function createUser(email, password, fullName, role, organizationId) {
  // This requires admin privileges on Supabase
  // For now, users will need to sign up themselves, then admin can update their role
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (error) throw error

  // Update user profile with role and organization
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      role,
      organization_id: organizationId,
      full_name: fullName,
    })
    .eq('id', data.user.id)

  if (profileError) throw profileError

  return data
}

// Update user role (admin only)
export async function updateUserRole(userId, role) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
  return data
}

// Update user organization (admin only)
export async function updateUserOrganization(userId, organizationId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ organization_id: organizationId })
    .eq('id', userId)

  if (error) throw error
  return data
}

// Delete user (admin only)
export async function deleteUser(userId) {
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error
}

// ===== User Invitation Functions =====

// Create invitation (admin only)
export async function createInvitation(email, organizationId, role = 'user') {
  // Generate token
  const { data: tokenData, error: tokenError } = await supabase
    .rpc('generate_invitation_token')

  if (tokenError) throw tokenError

  const token = tokenData

  // Set expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('user_invitations')
    .insert([
      {
        email,
        organization_id: organizationId,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get invitation by token
export async function getInvitationByToken(token) {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*, organizations(name)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error) throw error
  return data
}

// Mark invitation as used
export async function markInvitationUsed(token) {
  const { error } = await supabase
    .from('user_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  if (error) throw error
}

// Get all invitations for organization (admin only)
export async function getOrganizationInvitations(organizationId) {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Delete invitation (admin only)
export async function deleteInvitation(invitationId) {
  const { error } = await supabase
    .from('user_invitations')
    .delete()
    .eq('id', invitationId)

  if (error) throw error
}

// Sign up with invitation token
export async function signUpWithInvitation(email, password, fullName, invitationToken) {
  // Verify invitation
  const invitation = await getInvitationByToken(invitationToken)

  if (!invitation) {
    throw new Error('Invalid or expired invitation')
  }

  if (invitation.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Email does not match invitation')
  }

  // Create user account
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error

  // Update user profile with organization and role
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      organization_id: invitation.organization_id,
      role: invitation.role,
    })
    .eq('id', data.user.id)

  if (profileError) throw profileError

  // Mark invitation as used
  await markInvitationUsed(invitationToken)

  return data
}
