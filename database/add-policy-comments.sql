-- Add policy support to comments and entity_attachments tables
-- Run this in the Supabase SQL Editor

-- First, check what entity types exist that might violate the constraint
-- SELECT DISTINCT entity_type FROM entity_attachments;
-- SELECT DISTINCT entity_type FROM comments;

-- Update comments table to support policy entity type
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_entity_type_check;
ALTER TABLE comments ADD CONSTRAINT comments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident', 'policy', 'task'));

-- Update entity_attachments table to support policy entity type
-- Include 'task' in case there are task attachments
ALTER TABLE entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_entity_type_check;
ALTER TABLE entity_attachments ADD CONSTRAINT entity_attachments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident', 'policy', 'task'));
