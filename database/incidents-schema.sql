-- Incidents table schema
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- References
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

    -- Core Incident Info
    incident_number SERIAL,
    incident_details TEXT, -- Short description for list view
    incident_type TEXT, -- GL/Bodily Injury/Third Party Property Damage, Property Incident, etc.
    property_name TEXT,
    incident_only BOOLEAN DEFAULT FALSE, -- Whether this is incident-only (not a claim)

    -- Dates
    loss_date DATE,
    report_date DATE,

    -- Description
    event_description TEXT, -- Full event description

    -- Status
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PENDING', 'UNDER_REVIEW')),

    -- Additional Details
    reported_by TEXT,
    reported_by_email TEXT,
    reported_by_phone TEXT,

    -- Categorization
    cause_of_loss TEXT,
    injuries_reported BOOLEAN DEFAULT FALSE,
    police_report_filed BOOLEAN DEFAULT FALSE,
    police_report_number TEXT,

    -- Linked Claim (if incident becomes a claim)
    linked_claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incidents_organization_id ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_client_id ON incidents(client_id);
CREATE INDEX IF NOT EXISTS idx_incidents_location_id ON incidents(location_id);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_number ON incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_loss_date ON incidents(loss_date DESC);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if they exist)
DROP POLICY IF EXISTS "Users can view incidents from their organization" ON incidents;
DROP POLICY IF EXISTS "Users can insert incidents for their organization" ON incidents;
DROP POLICY IF EXISTS "Users can update incidents from their organization" ON incidents;
DROP POLICY IF EXISTS "Users can delete incidents from their organization" ON incidents;

CREATE POLICY "Users can view incidents from their organization"
    ON incidents FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert incidents for their organization"
    ON incidents FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update incidents from their organization"
    ON incidents FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete incidents from their organization"
    ON incidents FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidents_updated_at ON incidents;
CREATE TRIGGER incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_incidents_updated_at();

-- Update comments schema to support incidents
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_entity_type_check;
ALTER TABLE comments ADD CONSTRAINT comments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident'));

ALTER TABLE entity_attachments DROP CONSTRAINT IF EXISTS entity_attachments_entity_type_check;
ALTER TABLE entity_attachments ADD CONSTRAINT entity_attachments_entity_type_check
    CHECK (entity_type IN ('client', 'location', 'claim', 'incident'));
