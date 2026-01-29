-- Incidents schema update
-- Run this in the Supabase SQL Editor to add new fields

-- Add new columns to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS claimant TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS policy TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS accident_description TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS accident_state TEXT;

-- Loss Location fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS loss_street_1 TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS loss_street_2 TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS loss_city TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS loss_state TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS loss_postal_code TEXT;

-- Create tasks table for incidents (and claims)
CREATE TABLE IF NOT EXISTS entity_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Polymorphic reference
    entity_type TEXT NOT NULL CHECK (entity_type IN ('incident', 'claim', 'client', 'location')),
    entity_id UUID NOT NULL,

    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE,

    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_entity_tasks_organization_id ON entity_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_tasks_entity ON entity_tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tasks_status ON entity_tasks(status);
CREATE INDEX IF NOT EXISTS idx_entity_tasks_assigned_to ON entity_tasks(assigned_to);

-- Enable Row Level Security for tasks
ALTER TABLE entity_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
DROP POLICY IF EXISTS "Users can view tasks from their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can update tasks from their organization" ON entity_tasks;
DROP POLICY IF EXISTS "Users can delete tasks from their organization" ON entity_tasks;

CREATE POLICY "Users can view tasks from their organization"
    ON entity_tasks FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tasks for their organization"
    ON entity_tasks FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tasks from their organization"
    ON entity_tasks FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tasks from their organization"
    ON entity_tasks FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Create contacts table for entities
CREATE TABLE IF NOT EXISTS entity_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Polymorphic reference
    entity_type TEXT NOT NULL CHECK (entity_type IN ('incident', 'claim', 'client', 'location')),
    entity_id UUID NOT NULL,

    -- Contact details
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_entity_contacts_organization_id ON entity_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_contacts_entity ON entity_contacts(entity_type, entity_id);

-- Enable Row Level Security for contacts
ALTER TABLE entity_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
DROP POLICY IF EXISTS "Users can view contacts from their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can insert contacts for their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can update contacts from their organization" ON entity_contacts;
DROP POLICY IF EXISTS "Users can delete contacts from their organization" ON entity_contacts;

CREATE POLICY "Users can view contacts from their organization"
    ON entity_contacts FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert contacts for their organization"
    ON entity_contacts FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update contacts from their organization"
    ON entity_contacts FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete contacts from their organization"
    ON entity_contacts FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_entity_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entity_tasks_updated_at ON entity_tasks;
CREATE TRIGGER entity_tasks_updated_at
    BEFORE UPDATE ON entity_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_tasks_updated_at();

CREATE OR REPLACE FUNCTION update_entity_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entity_contacts_updated_at ON entity_contacts;
CREATE TRIGGER entity_contacts_updated_at
    BEFORE UPDATE ON entity_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_contacts_updated_at();
