-- Comments table schema
-- Run this in the Supabase SQL Editor

-- Comments table for clients, locations, and claims
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Polymorphic reference - can be attached to client, location, or claim
    entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'location', 'claim')),
    entity_id UUID NOT NULL,

    -- Comment content
    content TEXT NOT NULL,

    -- Author info
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT,
    author_email TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE
);

-- Attachments table for file uploads on comments
CREATE TABLE IF NOT EXISTS comment_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- File info
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,

    -- Uploader info
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standalone attachments (files attached directly to client/location/claim, not to a comment)
CREATE TABLE IF NOT EXISTS entity_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Polymorphic reference
    entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'location', 'claim')),
    entity_id UUID NOT NULL,

    -- File info
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,

    -- Uploader info
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_by_name TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_organization ON comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON comment_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_entity_attachments_entity ON entity_attachments(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
DROP POLICY IF EXISTS "Users can view comments from their organization" ON comments;
DROP POLICY IF EXISTS "Users can insert comments for their organization" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "Users can view comments from their organization"
    ON comments FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert comments for their organization"
    ON comments FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own comments"
    ON comments FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    USING (author_id = auth.uid());

-- RLS Policies for comment_attachments
DROP POLICY IF EXISTS "Users can view attachments from their organization" ON comment_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their organization" ON comment_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON comment_attachments;

CREATE POLICY "Users can view attachments from their organization"
    ON comment_attachments FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert attachments for their organization"
    ON comment_attachments FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own attachments"
    ON comment_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- RLS Policies for entity_attachments
DROP POLICY IF EXISTS "Users can view entity attachments from their organization" ON entity_attachments;
DROP POLICY IF EXISTS "Users can insert entity attachments for their organization" ON entity_attachments;
DROP POLICY IF EXISTS "Users can delete their own entity attachments" ON entity_attachments;

CREATE POLICY "Users can view entity attachments from their organization"
    ON entity_attachments FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert entity attachments for their organization"
    ON entity_attachments FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own entity attachments"
    ON entity_attachments FOR DELETE
    USING (uploaded_by = auth.uid());

-- Create storage bucket for attachments (run separately in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);
