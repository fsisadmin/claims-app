-- FINAL RLS RESET - DEAD SIMPLE
-- Run this ENTIRE script in Supabase SQL Editor
-- This uses the simplest possible approach with NO helper functions

-- ============================================
-- STEP 1: DROP EVERYTHING
-- ============================================

-- Drop all policies first
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read org members" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Authenticated users can read orgs" ON organizations;

DROP POLICY IF EXISTS "Users can view clients from their organization" ON clients;
DROP POLICY IF EXISTS "Users can insert clients to their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

DROP POLICY IF EXISTS "Users can view locations from their organization" ON locations;
DROP POLICY IF EXISTS "Users can insert locations for their organization" ON locations;
DROP POLICY IF EXISTS "Users can update locations from their organization" ON locations;
DROP POLICY IF EXISTS "Users can delete locations from their organization" ON locations;

DROP POLICY IF EXISTS "Users can view claims from their organization" ON claims;
DROP POLICY IF EXISTS "Users can insert claims for their organization" ON claims;
DROP POLICY IF EXISTS "Users can update claims from their organization" ON claims;
DROP POLICY IF EXISTS "Users can delete claims from their organization" ON claims;

DROP POLICY IF EXISTS "Users can view incidents from their organization" ON incidents;
DROP POLICY IF EXISTS "Users can insert incidents for their organization" ON incidents;
DROP POLICY IF EXISTS "Users can update incidents from their organization" ON incidents;
DROP POLICY IF EXISTS "Users can delete incidents from their organization" ON incidents;

DROP POLICY IF EXISTS "Users can view comments from their organization" ON comments;
DROP POLICY IF EXISTS "Users can insert comments for their organization" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

DROP POLICY IF EXISTS "Users can view attachments from their organization" ON comment_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their organization" ON comment_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON comment_attachments;

DROP POLICY IF EXISTS "Users can view entity attachments from their organization" ON entity_attachments;
DROP POLICY IF EXISTS "Users can insert entity attachments for their organization" ON entity_attachments;
DROP POLICY IF EXISTS "Users can delete their own entity attachments" ON entity_attachments;

DROP POLICY IF EXISTS "Users can view claim financials from their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can insert claim financials for their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can update claim financials from their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can delete claim financials from their organization" ON claim_financials;

DROP POLICY IF EXISTS "Users can view tasks from their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can update tasks from their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can delete tasks from their organization" ON entity_tasks;

DROP POLICY IF EXISTS "Users can view contacts from their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can insert contacts for their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can update contacts from their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can delete contacts from their organization" ON entity_contacts;

DROP POLICY IF EXISTS "Admins can view invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;

-- Drop the problematic helper function
DROP FUNCTION IF EXISTS public.get_user_org_id();

-- ============================================
-- STEP 2: CREATE SIMPLE POLICIES
-- ============================================

-- USER_PROFILES - Keep it simple: users can only read their own row
CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Allow users to update own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- ORGANIZATIONS - Any authenticated user can read
CREATE POLICY "Authenticated users can read orgs"
    ON organizations FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- CLIENTS
CREATE POLICY "Users can view clients from their organization"
    ON clients FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert clients to their organization"
    ON clients FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete clients"
    ON clients FOR DELETE
    USING (
        organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    );

-- LOCATIONS
CREATE POLICY "Users can view locations from their organization"
    ON locations FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert locations for their organization"
    ON locations FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update locations from their organization"
    ON locations FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete locations from their organization"
    ON locations FOR DELETE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- CLAIMS
CREATE POLICY "Users can view claims from their organization"
    ON claims FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert claims for their organization"
    ON claims FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update claims from their organization"
    ON claims FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete claims from their organization"
    ON claims FOR DELETE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- INCIDENTS
CREATE POLICY "Users can view incidents from their organization"
    ON incidents FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert incidents for their organization"
    ON incidents FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update incidents from their organization"
    ON incidents FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete incidents from their organization"
    ON incidents FOR DELETE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- COMMENTS
CREATE POLICY "Users can view comments from their organization"
    ON comments FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert comments for their organization"
    ON comments FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own comments"
    ON comments FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    USING (author_id = auth.uid());

-- COMMENT_ATTACHMENTS
CREATE POLICY "Users can view attachments from their organization"
    ON comment_attachments FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert attachments for their organization"
    ON comment_attachments FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own attachments"
    ON comment_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- ENTITY_ATTACHMENTS
CREATE POLICY "Users can view entity attachments from their organization"
    ON entity_attachments FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert entity attachments for their organization"
    ON entity_attachments FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own entity attachments"
    ON entity_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- CLAIM_FINANCIALS
CREATE POLICY "Users can view claim financials from their organization"
    ON claim_financials FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert claim financials for their organization"
    ON claim_financials FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update claim financials from their organization"
    ON claim_financials FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete claim financials from their organization"
    ON claim_financials FOR DELETE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ENTITY_TASKS
CREATE POLICY "Users can view tasks from their organization"
    ON entity_tasks FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tasks for their organization"
    ON entity_tasks FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tasks from their organization"
    ON entity_tasks FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tasks from their organization"
    ON entity_tasks FOR DELETE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- ENTITY_CONTACTS
CREATE POLICY "Users can view contacts from their organization"
    ON entity_contacts FOR SELECT
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert contacts for their organization"
    ON entity_contacts FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update contacts from their organization"
    ON entity_contacts FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete contacts from their organization"
    ON entity_contacts FOR DELETE
    USING (organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- USER_INVITATIONS
CREATE POLICY "Admins can view invitations"
    ON user_invitations FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Admins can create invitations"
    ON user_invitations FOR INSERT
    WITH CHECK (
        organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Admins can delete invitations"
    ON user_invitations FOR DELETE
    USING (
        organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    );
