-- Fix RLS Performance - Version 2 (Better Approach)
-- Run this in the Supabase SQL Editor
--
-- This creates a cached helper function and uses simple equality checks
-- instead of nested subqueries which can confuse the query planner

-- ============================================
-- STEP 1: Create a helper function that caches the user's org_id
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE  -- Tells Postgres the result is constant within a statement
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- ============================================
-- STEP 2: Create index on user_profiles for fast lookup
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);

-- ============================================
-- CLIENTS TABLE - Using simple equality
-- ============================================
DROP POLICY IF EXISTS "Users can view clients from their organization" ON clients;
DROP POLICY IF EXISTS "Users can insert clients to their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

CREATE POLICY "Users can view clients from their organization"
    ON clients FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert clients to their organization"
    ON clients FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Admins can delete clients"
    ON clients FOR DELETE
    USING (
        organization_id = public.get_user_org_id()
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- USER_PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    USING (id = auth.uid() OR organization_id = public.get_user_org_id());

CREATE POLICY "Allow users to update own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- ============================================
-- USER_INVITATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Admins can view invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;

CREATE POLICY "Admins can view invitations"
    ON user_invitations FOR SELECT
    USING (
        organization_id = public.get_user_org_id()
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can create invitations"
    ON user_invitations FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_org_id()
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can delete invitations"
    ON user_invitations FOR DELETE
    USING (
        organization_id = public.get_user_org_id()
        AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read orgs" ON organizations;

CREATE POLICY "Authenticated users can read orgs"
    ON organizations FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================
-- LOCATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view locations from their organization" ON locations;
DROP POLICY IF EXISTS "Users can insert locations for their organization" ON locations;
DROP POLICY IF EXISTS "Users can update locations from their organization" ON locations;
DROP POLICY IF EXISTS "Users can delete locations from their organization" ON locations;

CREATE POLICY "Users can view locations from their organization"
    ON locations FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert locations for their organization"
    ON locations FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update locations from their organization"
    ON locations FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete locations from their organization"
    ON locations FOR DELETE
    USING (organization_id = public.get_user_org_id());

-- ============================================
-- COMMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view comments from their organization" ON comments;
DROP POLICY IF EXISTS "Users can insert comments for their organization" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "Users can view comments from their organization"
    ON comments FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert comments for their organization"
    ON comments FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update their own comments"
    ON comments FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    USING (author_id = auth.uid());

-- ============================================
-- COMMENT_ATTACHMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view attachments from their organization" ON comment_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their organization" ON comment_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON comment_attachments;

CREATE POLICY "Users can view attachments from their organization"
    ON comment_attachments FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert attachments for their organization"
    ON comment_attachments FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete their own attachments"
    ON comment_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- ============================================
-- ENTITY_ATTACHMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view entity attachments from their organization" ON entity_attachments;
DROP POLICY IF EXISTS "Users can insert entity attachments for their organization" ON entity_attachments;
DROP POLICY IF EXISTS "Users can delete their own entity attachments" ON entity_attachments;

CREATE POLICY "Users can view entity attachments from their organization"
    ON entity_attachments FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert entity attachments for their organization"
    ON entity_attachments FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete their own entity attachments"
    ON entity_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- ============================================
-- CLAIMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view claims from their organization" ON claims;
DROP POLICY IF EXISTS "Users can insert claims for their organization" ON claims;
DROP POLICY IF EXISTS "Users can update claims from their organization" ON claims;
DROP POLICY IF EXISTS "Users can delete claims from their organization" ON claims;

CREATE POLICY "Users can view claims from their organization"
    ON claims FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert claims for their organization"
    ON claims FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update claims from their organization"
    ON claims FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete claims from their organization"
    ON claims FOR DELETE
    USING (organization_id = public.get_user_org_id());

-- ============================================
-- INCIDENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view incidents from their organization" ON incidents;
DROP POLICY IF EXISTS "Users can insert incidents for their organization" ON incidents;
DROP POLICY IF EXISTS "Users can update incidents from their organization" ON incidents;
DROP POLICY IF EXISTS "Users can delete incidents from their organization" ON incidents;

CREATE POLICY "Users can view incidents from their organization"
    ON incidents FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert incidents for their organization"
    ON incidents FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update incidents from their organization"
    ON incidents FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete incidents from their organization"
    ON incidents FOR DELETE
    USING (organization_id = public.get_user_org_id());

-- ============================================
-- CLAIM_FINANCIALS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view claim financials from their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can insert claim financials for their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can update claim financials from their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can delete claim financials from their organization" ON claim_financials;

CREATE POLICY "Users can view claim financials from their organization"
    ON claim_financials FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert claim financials for their organization"
    ON claim_financials FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update claim financials from their organization"
    ON claim_financials FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete claim financials from their organization"
    ON claim_financials FOR DELETE
    USING (organization_id = public.get_user_org_id());

-- ============================================
-- ENTITY_TASKS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view tasks from their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can update tasks from their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can delete tasks from their organization" ON entity_tasks;

CREATE POLICY "Users can view tasks from their organization"
    ON entity_tasks FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert tasks for their organization"
    ON entity_tasks FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update tasks from their organization"
    ON entity_tasks FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete tasks from their organization"
    ON entity_tasks FOR DELETE
    USING (organization_id = public.get_user_org_id());

-- ============================================
-- ENTITY_CONTACTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view contacts from their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can insert contacts for their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can update contacts from their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can delete contacts from their organization" ON entity_contacts;

CREATE POLICY "Users can view contacts from their organization"
    ON entity_contacts FOR SELECT
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert contacts for their organization"
    ON entity_contacts FOR INSERT
    WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update contacts from their organization"
    ON entity_contacts FOR UPDATE
    USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can delete contacts from their organization"
    ON entity_contacts FOR DELETE
    USING (organization_id = public.get_user_org_id());
