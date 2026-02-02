-- Add 'task' to entity_attachments entity_type constraint
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_entity_type_check;

-- Add the new constraint that includes 'task'
ALTER TABLE entity_attachments ADD CONSTRAINT entity_attachments_entity_type_check
  CHECK (entity_type IN ('client', 'location', 'claim', 'incident', 'task'));

-- Create index for task attachments
CREATE INDEX IF NOT EXISTS idx_entity_attachments_task ON entity_attachments(entity_id) WHERE entity_type = 'task';
