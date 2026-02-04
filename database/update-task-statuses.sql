-- Update tasks status check constraint to use new values
-- Old: open, in_progress, completed, closed, cancelled
-- New: assigned, in_progress, completed, cancelled

-- First, update any existing tasks with old status values
UPDATE tasks SET status = 'assigned' WHERE status = 'open';
UPDATE tasks SET status = 'cancelled' WHERE status = 'closed';

-- Drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new constraint with updated values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled'));
