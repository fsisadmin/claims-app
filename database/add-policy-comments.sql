-- Add policy support to comments and entity_attachments tables
-- Run this in the Supabase SQL Editor

-- Update comments table to support policy entity type
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_entity_type_check;
ALTER TABLE comments ADD CONSTRAINT comments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident', 'policy'));

-- Update entity_attachments table to support policy entity type
ALTER TABLE entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_entity_type_check;
ALTER TABLE entity_attachments ADD CONSTRAINT entity_attachments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident', 'policy'));
