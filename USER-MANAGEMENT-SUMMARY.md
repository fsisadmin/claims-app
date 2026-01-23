# User Management System - Complete Overview

## What Was Built

I've created a complete team-based user management system with authentication and role-based access control for your Franklin Street Claims App.

## Key Features

### 1. Authentication System
- **Sign Up** (`/signup`) - New users can create accounts
- **Login** (`/login`) - Secure email/password authentication
- **Logout** - Users can sign out from the header menu
- **Session Management** - Automatic session handling with Supabase Auth

### 2. Organization/Team-Based Access
- Users belong to **organizations** (e.g., "Franklin Street Properties")
- Users can only see **clients from their own organization**
- Multiple organizations can exist in the same database
- Data is completely isolated between organizations using Row Level Security

### 3. Role-Based Access Control

Three user roles with different permissions:

| Feature | User | Manager | Admin |
|---------|------|---------|-------|
| View clients | ✅ | ✅ | ✅ |
| Add clients | ✅ | ✅ | ✅ |
| Edit clients | ✅ | ✅ | ✅ |
| Delete clients | ❌ | ❌ | ✅ |
| View user list | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |
| Remove users | ❌ | ❌ | ✅ |

### 4. Admin Dashboard
- Located at `/admin/users` (only accessible to admins)
- View all users in your organization
- Change user roles (user, manager, admin)
- Remove users from the organization
- See when users joined

### 5. Enhanced Header
- Shows user's name and initials in a profile avatar
- Dropdown menu with:
  - Full name
  - Email address
  - Current role (with badge)
  - Organization name
  - Sign out button
- "Admin" link in navigation (only visible to admins)

### 6. Protected Pages
All pages now require authentication:
- **Home page** (`/`) - Redirects to login if not authenticated
- **Add Client** (`/clients/add`) - Requires login + organization membership
- **Client Detail** (`/clients/[id]`) - Requires login
- **Admin Dashboard** (`/admin/users`) - Requires admin role

## File Structure

### New Files Created

```
📁 app/
├── 📁 admin/
│   └── 📁 users/
│       └── page.js          # Admin dashboard for user management
├── 📁 login/
│   └── page.js              # Login page
├── 📁 signup/
│   └── page.js              # Sign up page
└── layout.js                # Updated with AuthProvider

📁 components/
└── Header.js                # Updated with user menu and logout

📁 contexts/
└── AuthContext.js           # Authentication context provider

📁 lib/
├── auth.js                  # Authentication helper functions
└── supabase.js              # Supabase client (existing)

📄 supabase-auth-schema.sql  # Database schema for auth system
📄 AUTH-SETUP.md             # Detailed setup instructions
📄 USER-MANAGEMENT-SUMMARY.md # This file
```

### Modified Files

```
📝 app/page.js               # Added auth checks
📝 app/clients/add/page.js   # Added auth checks + organization_id
📝 app/clients/[id]/page.js  # Added auth checks
📝 app/layout.js             # Wrapped with AuthProvider
```

## Database Schema

### New Tables

**organizations**
- `id` - UUID primary key
- `name` - Organization name
- `created_at`, `updated_at` - Timestamps

**user_profiles**
- `id` - UUID (references auth.users)
- `organization_id` - Links user to organization
- `email` - User's email
- `full_name` - User's full name
- `role` - admin, manager, or user
- `created_at`, `updated_at` - Timestamps

### Modified Tables

**clients**
- Added `organization_id` - Links client to organization

## Security Features

### Row Level Security (RLS)
Automatically enforced at the database level:
- ✅ Users can only see clients from their organization
- ✅ Users can only see profiles from their organization
- ✅ Only admins can delete clients
- ✅ Only admins can change user roles
- ✅ Users can update their own profile

### Password Requirements
- Minimum 6 characters (configurable in Supabase)
- Hashed and stored securely by Supabase Auth
- Password reset via email (built into Supabase)

### Session Management
- Secure JWT tokens
- Automatic token refresh
- HTTP-only cookies (when configured)

## How It Works

### User Signup Flow
1. User visits `/signup` and enters details
2. Supabase creates account in `auth.users` table
3. Trigger automatically creates profile in `user_profiles` table
4. Admin assigns user to organization (via SQL or future UI)
5. User can now access clients from their organization

### Login Flow
1. User visits `/login` and enters credentials
2. Supabase validates and creates session
3. AuthContext loads user profile and organization
4. User is redirected to home page
5. Header shows user info and role

### Client Access Flow
1. User requests clients from home page
2. Supabase applies RLS policies automatically
3. Only clients matching user's `organization_id` are returned
4. Client cards are displayed in grid

### Role Change Flow
1. Admin visits `/admin/users`
2. Admin clicks "Change Role" on a user
3. Admin selects new role from dropdown
4. System updates `user_profiles.role`
5. User's permissions change immediately

## API Functions

### Authentication (`lib/auth.js`)
- `signUp(email, password, fullName)` - Create new account
- `signIn(email, password)` - Login
- `signOut()` - Logout
- `getCurrentUser()` - Get current user
- `getUserProfile(userId)` - Get user profile with organization
- `isAdmin(userId)` - Check if user is admin
- `getOrganizationUsers(organizationId)` - Get all users in org
- `updateUserRole(userId, role)` - Change user role
- `updateUserOrganization(userId, organizationId)` - Move user to org
- `deleteUser(userId)` - Delete user account

### Auth Context (`contexts/AuthContext.js`)
Provides these values to all components:
- `user` - Current authenticated user
- `profile` - User profile with organization data
- `loading` - Loading state
- `isAdmin` - Boolean, true if user is admin
- `isManager` - Boolean, true if user is manager or admin

## Quick Start Guide

### 1. Run the SQL Schema
```bash
# Open Supabase SQL Editor and run:
supabase-auth-schema.sql
```

### 2. Create First Admin
```bash
# Sign up at /signup, then run in SQL Editor:
UPDATE user_profiles
SET role = 'admin',
    organization_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'your.email@example.com';
```

### 3. Start the App
```bash
npm run dev
```

### 4. Test It Out
- Login at `/login`
- View clients at `/`
- Visit admin dashboard at `/admin/users`
- Try signing out and back in

## Common Tasks

### Add a New User to Organization
```sql
UPDATE user_profiles
SET organization_id = 'YOUR_ORG_ID',
    role = 'user'
WHERE email = 'newuser@example.com';
```

### Change User Role
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'user@example.com';
```

### Create New Organization
```sql
INSERT INTO organizations (name)
VALUES ('New Company Name')
RETURNING id;
```

### Move User to Different Organization
```sql
UPDATE user_profiles
SET organization_id = 'NEW_ORG_ID'
WHERE email = 'user@example.com';
```

### Link Clients to Organization
```sql
UPDATE clients
SET organization_id = 'YOUR_ORG_ID'
WHERE organization_id IS NULL;
```

## Testing Checklist

- [ ] New user can sign up
- [ ] User can login
- [ ] User without organization sees "Organization Required" message
- [ ] User with organization can see clients
- [ ] User can add new client (auto-linked to their org)
- [ ] User can search clients
- [ ] Admin can access `/admin/users`
- [ ] Non-admin cannot access `/admin/users`
- [ ] Admin can change user roles
- [ ] Admin can remove users
- [ ] User can logout
- [ ] Header shows correct user info
- [ ] Different users see different clients (based on organization)

## Future Enhancements

### Suggested Next Steps:
1. **Email Invitations** - Let admins invite users via email
2. **Password Reset Page** - UI for resetting forgotten passwords
3. **Profile Editing** - Let users update their name/email
4. **Organization Settings** - Page to edit organization details
5. **Activity Log** - Track who added/edited/deleted clients
6. **User Avatars** - Upload profile pictures
7. **MFA/2FA** - Two-factor authentication
8. **API Keys** - Generate API keys for third-party integrations
9. **Bulk User Import** - CSV upload for adding many users
10. **Teams within Organizations** - Sub-groups within an organization

## Troubleshooting

### Can't Login
- Check `.env.local` has correct Supabase credentials
- Verify email auth is enabled in Supabase
- Check browser console for errors

### Can't See Clients
- Verify user has `organization_id` set
- Check clients have `organization_id` set
- Confirm RLS policies are enabled

### Admin Dashboard Shows No Users
- Verify you have admin role
- Check other users have same `organization_id`
- Look for errors in browser console

## Support & Documentation

- **Setup Guide**: See [AUTH-SETUP.md](AUTH-SETUP.md)
- **General Setup**: See [SETUP.md](SETUP.md)
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Built with:**
- Next.js 16
- Supabase Auth
- Tailwind CSS
- Row Level Security (RLS)
