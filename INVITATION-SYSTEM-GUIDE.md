# User Invitation System - Complete Guide

## Overview

Your claims app now has a secure, admin-controlled user invitation system. Public signup is disabled, and only invited users can create accounts.

## What Changed

### 1. Input Text Visibility Fixed
- All form inputs now have dark text that's clearly visible
- Applied to login, signup, and password reset pages

### 2. Password Reset System
- **Forgot Password Link** - Added to login page
- **Reset Request Page** (`/reset-password`) - Users enter their email to request a reset
- **Update Password Page** (`/update-password`) - Users set a new password after clicking the email link
- Automatic email delivery via Supabase Auth

### 3. Invitation-Only Signup
- **Public signup disabled** - `/signup` now requires an invitation token
- **Token validation** - Checks if invitation is valid and not expired
- **Email locked** - Invited email cannot be changed during signup
- **Auto-assignment** - New users automatically get assigned to the organization and role from the invitation

### 4. Admin Invitation Dashboard
- **Create invitations** (`/admin/invite`) - Admins can invite new users
- **Manage invitations** - View pending invitations, copy links, delete unused invitations
- **Role assignment** - Set user role (user, manager, admin) when creating invitation
- **Expiration** - Invitations expire after 7 days

## Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- See supabase-invitations-schema.sql for the complete schema
```

This creates:
- `user_invitations` table
- Row Level Security policies (only admins can create/view invitations)
- Token generation function

## How It Works

### Admin Workflow

1. **Create Invitation**
   - Admin goes to `/admin/invite`
   - Enters user's email and selects role
   - Click "Create invitation"
   - System generates unique invitation link

2. **Send Invitation**
   - Copy the invitation link
   - Send it to the user via email, Slack, or any other method
   - Link expires in 7 days

3. **Track Invitations**
   - View all pending invitations on the same page
   - See expiration dates
   - Delete invitations if needed
   - Copy links again if user lost the original

### User Workflow

1. **Receive Invitation**
   - User receives invitation link from admin
   - Link looks like: `https://yourapp.com/signup?token=abc123...`

2. **Create Account**
   - User clicks the link
   - System validates the invitation token
   - Email field is pre-filled and locked
   - User enters their name and password
   - Submits the form

3. **Auto-Configuration**
   - Account is created with Supabase Auth
   - User profile is automatically assigned to:
     - The correct organization
     - The role specified in the invitation
   - Invitation is marked as used
   - User is redirected to login page

4. **First Login**
   - User logs in with their email and password
   - Immediately has access to clients from their organization

### Password Reset Workflow

1. **Request Reset**
   - User clicks "Forgot password?" on login page
   - Enters their email
   - Receives password reset email from Supabase

2. **Reset Password**
   - User clicks link in email
   - Taken to `/update-password` page
   - Enters new password twice
   - Password is updated
   - Redirected to login page

## Setup Steps

### 1. Run the Invitation Schema SQL

```bash
# Open Supabase SQL Editor and run:
supabase-invitations-schema.sql
```

### 2. Configure Email Templates (Optional but Recommended)

In Supabase Dashboard:
1. Go to **Authentication** → **Email Templates**
2. Customize the password reset email template
3. Add your branding and messaging

### 3. Test the System

1. **As Admin:**
   - Login to your app
   - Go to `/admin/invite`
   - Create a test invitation
   - Copy the link

2. **As New User:**
   - Open the invitation link in a private/incognito window
   - Complete the signup form
   - Try logging in
   - Verify you can see clients

3. **Test Password Reset:**
   - Logout
   - Click "Forgot password?"
   - Enter your email
   - Check your email inbox
   - Follow the reset link
   - Set a new password
   - Login with new password

## Features

### Invitation Management

**Create Invitations:**
- Email validation
- Role selection (user, manager, admin)
- Automatic token generation
- 7-day expiration

**View Invitations:**
- See all pending (unused) invitations
- Check expiration dates
- Copy links to send again
- Delete invalid or unwanted invitations

**Security:**
- Tokens are cryptographically secure (64 random bytes)
- One-time use (marked as used after signup)
- Time-limited (expire after 7 days)
- Email must match invitation

### Signup Protection

**Token Required:**
- Cannot access `/signup` without a valid token
- Friendly error page if no token provided
- Validation happens before showing form

**Token Validation:**
- Checks if token exists
- Verifies token hasn't been used
- Confirms token hasn't expired
- Loads organization info for display

**Email Locking:**
- Email field is pre-filled from invitation
- Field is disabled to prevent changes
- Ensures user signs up with invited email

### Password Reset

**Request Flow:**
- Simple email input form
- Sends reset email via Supabase
- Success message with instructions
- Link to return to login

**Reset Flow:**
- Validates reset token from email
- Password confirmation field
- Minimum 6 character requirement
- Success notification before redirect

## Navigation Updates

### Header Changes

Admins now see two links in the navigation:
- **Users** - View and manage existing users (`/admin/users`)
- **Invite** - Create and manage invitations (`/admin/invite`)

### Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| User Management | `/admin/users` | View users, change roles, remove users |
| Invite Users | `/admin/invite` | Create invitations, manage pending invites |

## API Functions

All in [lib/auth.js](lib/auth.js):

### Invitation Functions

```javascript
// Create new invitation
createInvitation(email, organizationId, role)

// Get invitation by token
getInvitationByToken(token)

// Mark invitation as used
markInvitationUsed(token)

// Get all invitations for organization
getOrganizationInvitations(organizationId)

// Delete invitation
deleteInvitation(invitationId)

// Sign up with invitation
signUpWithInvitation(email, password, fullName, invitationToken)
```

### Password Reset Functions

```javascript
// Built into Supabase Auth
supabase.auth.resetPasswordForEmail(email, options)
supabase.auth.updateUser({ password: newPassword })
```

## Security Considerations

### Invitation Security
- Tokens are 64 bytes of random data (128 hex characters)
- Cannot be guessed or brute-forced
- One-time use only
- Time-limited (7 days)
- Email verification required

### Row Level Security
- Only admins can create invitations
- Only admins can view/delete invitations
- All policies enforce organization boundaries

### Password Security
- Minimum 6 characters (configurable in Supabase)
- Passwords are hashed by Supabase Auth
- Never stored in plain text
- Reset links expire (configurable in Supabase, default 1 hour)

## Common Tasks

### Create Admin Invitation

```javascript
// As an admin, in /admin/invite:
1. Enter email: newadmin@example.com
2. Select role: Admin
3. Click "Create invitation"
4. Copy the generated link
5. Send to user via email
```

### Resend Invitation

If a user lost their invitation link:
1. Go to `/admin/invite`
2. Find their email in "Pending Invitations"
3. Click "Copy Link"
4. Send the link again

### Delete Old Invitations

To clean up expired or unused invitations:
1. Go to `/admin/invite`
2. Find the invitation in the list
3. Click "Delete"
4. Confirm deletion

### Reset User Password (User-Initiated)

Users can reset their own password:
1. User goes to `/login`
2. Clicks "Forgot password?"
3. Enters their email
4. Receives reset email
5. Clicks link in email
6. Sets new password

### Reset User Password (Admin-Initiated)

If you need to reset a user's password as admin:
1. Have them follow the user-initiated flow above, OR
2. In Supabase Dashboard → Authentication → Users
3. Find the user
4. Click the "..." menu
5. Select "Send password recovery email"

## Troubleshooting

### "Email not confirmed" error

This happens when email confirmation is enabled in Supabase:
- **Solution 1:** In Supabase → Authentication → Email Auth → Disable "Confirm email"
- **Solution 2:** Have users check their email for confirmation link

### Invitation link not working

Possible causes:
- Link expired (> 7 days old) - Create new invitation
- Link already used - Create new invitation
- Wrong email - User must use the exact email that was invited

### Password reset email not arriving

Check:
- Email is correct
- Check spam folder
- Verify Supabase email settings
- Test with a different email provider

### Can't create invitations

Verify:
- You're logged in as an admin
- Your organization_id is set
- RLS policies are correctly applied
- You ran the invitation schema SQL

## Files Created/Modified

### New Files
- [app/reset-password/page.js](app/reset-password/page.js) - Password reset request page
- [app/update-password/page.js](app/update-password/page.js) - Set new password page
- [app/admin/invite/page.js](app/admin/invite/page.js) - Admin invitation management
- [supabase-invitations-schema.sql](supabase-invitations-schema.sql) - Database schema
- [INVITATION-SYSTEM-GUIDE.md](INVITATION-SYSTEM-GUIDE.md) - This file

### Modified Files
- [app/signup/page.js](app/signup/page.js) - Now requires invitation token
- [app/login/page.js](app/login/page.js) - Added "Forgot password?" link, fixed input visibility
- [components/Header.js](components/Header.js) - Added Users and Invite links for admins
- [lib/auth.js](lib/auth.js) - Added invitation functions

## Next Steps

### Recommended Enhancements

1. **Email Integration**
   - Use SendGrid, Mailgun, or similar to send invitation emails directly from the app
   - Create custom email templates with your branding

2. **Invitation Analytics**
   - Track invitation open rates
   - See which invitations were accepted
   - Monitor invitation expiration

3. **Bulk Invitations**
   - Upload CSV of emails
   - Create multiple invitations at once
   - Useful for onboarding many users

4. **Custom Expiration**
   - Let admins set expiration time per invitation
   - Options: 1 day, 3 days, 7 days, 30 days, never

5. **Invitation Templates**
   - Pre-fill email with message
   - Copy to clipboard with message
   - Direct email sending from app

## Support

For questions or issues:
- Check [AUTH-SETUP.md](AUTH-SETUP.md) for general auth setup
- See [USER-MANAGEMENT-SUMMARY.md](USER-MANAGEMENT-SUMMARY.md) for role details
- Review Supabase Auth documentation
