-- Add 'incident' to entity_type constraints for comments and entity_attachments tables
-- Run this in the Supabase SQL Editor

-- Update comments table constraint to include 'incident'
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_entity_type_check;
ALTER TABLE comments ADD CONSTRAINT comments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident'));

-- Update entity_attachments table constraint to include 'incident'
ALTER TABLE entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_entity_type_check;
ALTER TABLE entity_attachments ADD CONSTRAINT entity_attachments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident'));

-- Note: The incidents page already queries comments with entity_type = 'incident'
-- This migration allows those queries to work properly
