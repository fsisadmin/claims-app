# Authentication & User Management Setup Guide

This guide explains how to set up the complete authentication and team-based user management system for your Franklin Street Claims App.

## Overview

The system includes:
- **User Authentication** - Sign up, login, logout with Supabase Auth
- **Team/Organization-Based Access** - Users belong to organizations and only see their organization's clients
- **Role-Based Access Control** - Three roles: admin, manager, and user
- **Admin Dashboard** - Admins can manage users and roles

## Database Schema

Run the SQL scripts in your Supabase SQL Editor in this order:

### 1. First, run the basic schema (already done)
This creates the clients table and sample data. You should have already run [supabase-schema.sql](supabase-schema.sql).

### 2. Then, run the authentication schema
Open [supabase-auth-schema.sql](supabase-auth-schema.sql) and run it in the Supabase SQL Editor. This will:
- Create the `organizations` table
- Create the `user_profiles` table
- Add `organization_id` to the `clients` table
- Set up Row Level Security (RLS) policies
- Create triggers for automatic profile creation
- Update existing clients to belong to a sample organization

## Setup Steps

### Step 1: Run the Auth Schema SQL

1. Go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy all the SQL from [supabase-auth-schema.sql](supabase-auth-schema.sql)
5. Paste it into the editor
6. Click **Run** (or press Ctrl+Enter)

### Step 2: Enable Email Auth in Supabase

1. In your Supabase project, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates (optional but recommended):
   - Go to **Authentication** → **Email Templates**
   - Customize the signup confirmation and password reset emails

### Step 3: Create Your First Admin User

1. Start your dev server: `npm run dev`
2. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
3. Sign up with your email and password
4. After signing up, go to Supabase → **Authentication** → **Users**
5. Copy your user ID (it looks like: `a1b2c3d4-...`)
6. Go to **SQL Editor** and run this command (replace `YOUR_USER_ID`):

```sql
UPDATE user_profiles
SET role = 'admin',
    organization_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'YOUR_USER_ID';
```

7. Refresh your browser - you should now be logged in and see the clients

## User Roles

### Admin
- Can view all users in their organization
- Can change user roles
- Can remove users from the organization
- Can add/edit/delete clients
- Has access to the Admin dashboard at `/admin/users`

### Manager
- Can add/edit/delete clients
- Can view all clients in their organization
- Cannot manage users

### User
- Can view and edit clients in their organization
- Can add new clients
- Cannot delete clients
- Cannot manage users

## Adding New Users

There are two ways to add new users to your organization:

### Method 1: Sign Up + Admin Assignment (Recommended)

1. New user goes to `/signup` and creates an account
2. Admin goes to Supabase SQL Editor and runs:

```sql
UPDATE user_profiles
SET role = 'user',
    organization_id = 'YOUR_ORG_ID'
WHERE email = 'newuser@example.com';
```

3. User refreshes their browser and can now access clients

### Method 2: Admin Creates User (Requires Supabase API Keys)

This method requires setting up service role keys, which is more advanced. For now, use Method 1.

## Creating Additional Organizations

If you need multiple organizations (e.g., different companies or departments):

```sql
-- Create a new organization
INSERT INTO organizations (name) VALUES ('Company Name')
RETURNING id;

-- Assign users to the new organization (use the returned ID)
UPDATE user_profiles
SET organization_id = 'NEW_ORG_ID'
WHERE id IN ('USER_ID_1', 'USER_ID_2');
```

## Row Level Security (RLS)

The system uses Supabase Row Level Security to ensure:
- Users can only see clients from their organization
- Users can only see other users in their organization
- Only admins can change user roles
- Only admins can delete clients

These policies are automatically enforced by Supabase.

## Features

### Authentication Pages
- `/signup` - Create a new account
- `/login` - Sign in to your account
- Password reset (via email, handled by Supabase)

### Protected Pages
- `/` - Home page with clients grid (requires login)
- `/clients/add` - Add new client (requires login + organization)
- `/clients/[id]` - View client details (requires login)
- `/admin/users` - User management (requires admin role)

### Header Features
- Shows user's name and initials
- Dropdown menu with:
  - User info (name, email, role, organization)
  - Sign out button
- "Admin" link in navigation (only visible to admins)

## Troubleshooting

### "Organization Required" message
- Your user profile doesn't have an organization assigned
- Ask an admin to assign you to an organization using the SQL command above

### "No clients" showing up
- Make sure your clients have an `organization_id` set
- Run this to fix existing clients:
```sql
UPDATE clients
SET organization_id = 'YOUR_ORG_ID'
WHERE organization_id IS NULL;
```

### Can't see other users in Admin dashboard
- Make sure you have the admin role
- Check that other users have the same `organization_id` as you

### Login not working
- Check that Supabase credentials are correct in `.env.local`
- Verify email auth is enabled in Supabase
- Check browser console for errors

## Security Best Practices

1. **Never expose service role keys** - Only use the anon key in your `.env.local`
2. **Always use RLS** - All tables should have RLS enabled (already done)
3. **Validate on the server** - RLS policies enforce security at the database level
4. **Use strong passwords** - Minimum 6 characters (can be configured in Supabase)
5. **Enable MFA** - Can be enabled per-user in Supabase Auth settings

## Next Steps

After setting up authentication, you might want to:

1. **Customize email templates** - Make signup/reset emails match your branding
2. **Add password reset page** - Create a page for users to reset their password
3. **Add profile editing** - Let users update their name and email
4. **Add user invitations** - Create a flow for admins to invite users via email
5. **Add audit logging** - Track who made changes to clients
6. **Enable MFA** - Add two-factor authentication for extra security

## Testing the System

1. Create 2-3 test users with different roles
2. Sign in as each user and verify:
   - Users can see clients from their organization
   - Admins can access `/admin/users`
   - Non-admins cannot access `/admin/users`
   - Users can add clients (they're automatically linked to their org)
   - Search works correctly

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Check the Supabase logs in the dashboard
3. Verify your SQL queries ran successfully
4. Make sure RLS is enabled on all tables
