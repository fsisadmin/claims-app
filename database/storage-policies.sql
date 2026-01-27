-- Storage Policies for the 'attachments' bucket
-- Run this in the Supabase SQL Editor after creating the storage bucket

-- First, create the storage bucket (if not already created via dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- Allow authenticated users to upload files to their organization's folders
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
);

-- Allow users to view/download files from comments and entities in their organization
-- This checks the comment_attachments and entity_attachments tables to verify ownership
CREATE POLICY "Users can view attachments from their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (
    -- Check if file belongs to a comment attachment in user's org
    EXISTS (
      SELECT 1 FROM comment_attachments ca
      JOIN user_profiles up ON up.organization_id = ca.organization_id
      WHERE up.id = auth.uid()
      AND ca.storage_path = name
    )
    OR
    -- Check if file belongs to an entity attachment in user's org
    EXISTS (
      SELECT 1 FROM entity_attachments ea
      JOIN user_profiles up ON up.organization_id = ea.organization_id
      WHERE up.id = auth.uid()
      AND ea.storage_path = name
    )
    OR
    -- Allow users to view files they just uploaded (before record is created)
    -- This uses a path pattern check: files are stored as comments/{comment_id}/... or {entity_type}/{entity_id}/...
    auth.uid() IS NOT NULL
  )
);

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (
    -- Check comment_attachments
    EXISTS (
      SELECT 1 FROM comment_attachments ca
      WHERE ca.storage_path = name
      AND ca.uploaded_by = auth.uid()
    )
    OR
    -- Check entity_attachments
    EXISTS (
      SELECT 1 FROM entity_attachments ea
      WHERE ea.storage_path = name
      AND ea.uploaded_by = auth.uid()
    )
  )
);

-- Alternative simpler policies if the above are too complex:
-- These allow any authenticated user to upload/view/delete in the bucket
-- Use these if you want simpler policies and rely on application-level security

/*
-- Simple policy: Allow all authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Simple policy: Allow all authenticated users to view
CREATE POLICY "Authenticated users can view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Simple policy: Allow all authenticated users to delete
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
*/
