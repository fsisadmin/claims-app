-- Run this in Supabase SQL Editor to check your user profile setup

-- Check if user_profiles table exists and has data
SELECT
  id,
  email,
  full_name,
  role,
  organization_id,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Check RLS policies on user_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Check if organizations table has data
SELECT
  id,
  name,
  created_at
FROM organizations
ORDER BY created_at DESC;
