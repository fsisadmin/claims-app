-- Tasks Management Schema
-- Creates a task system with assignments, due dates, and entity linking

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Client association (required)
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name VARCHAR(255),  -- Denormalized for display

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_url TEXT,  -- Optional URL/link for task content

  -- Assignment & ownership
  owner_id UUID REFERENCES user_profiles(id),  -- Who created/owns the task
  assigned_to UUID REFERENCES user_profiles(id),  -- Who the task is assigned to

  -- Status & priority
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed', 'cancelled')),
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Dates
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Additional entity linking (optional - location, claim, etc. within the client)
  linked_entity_type VARCHAR(50) CHECK (linked_entity_type IN ('location', 'claim', 'incident', 'policy')),
  linked_entity_id UUID,
  linked_entity_name VARCHAR(255),  -- Denormalized for display

  -- Sharing
  is_shared BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  modified_by UUID REFERENCES user_profiles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_organization ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity ON tasks(linked_entity_type, linked_entity_id);

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks or if admin" ON tasks;

-- Users can view tasks in their organization
CREATE POLICY "Users can view tasks in their organization"
  ON tasks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can create tasks in their organization
CREATE POLICY "Users can create tasks in their organization"
  ON tasks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update tasks in their organization
CREATE POLICY "Users can update tasks in their organization"
  ON tasks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete tasks they own or if they're admin
CREATE POLICY "Users can delete their own tasks or if admin"
  ON tasks FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
